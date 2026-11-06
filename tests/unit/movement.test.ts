import { expect, it } from 'vitest';
import { Simulation } from '../../src/simulation/simulation';
import { S0_LEVEL } from '../../src/core/config';
import { createInitialState } from '../../src/simulation/initialState';
import { createFormation } from '../../src/core/formation';
import { moveAgents } from '../../src/simulation/movement';
import { assertInvariants } from '../../src/simulation/invariants';
import { Session } from '../../src/app/session';
import { S0_CLOCK } from '../../src/core/config';

it('Restart during motion restores the entire initial state and clears pending orders and time', () => {
  const session = new Session(S0_LEVEL, S0_CLOCK);
  const initial = session.getSnapshot();
  const first = initial.agents[0]!;
  session.submit({ type: 'select-group', point: first });
  session.advance(S0_CLOCK.stepMs);
  session.submit({ type: 'set-formation', groupId: 'group-1', points: path });
  expect(session.advance(S0_CLOCK.stepMs * 1.5).agents).not.toEqual(initial.agents);
  session.submit({ type: 'set-formation', groupId: 'group-1', points: [...path].reverse() });
  session.submit('restart');
  expect(session.advance(1000)).toEqual(initial);
  expect(session.commandLog).toEqual([]);
  expect(session.advance(S0_CLOCK.stepMs / 2)).toEqual(initial);
});

const path = [
  { x: 650, y: 250 },
  { x: 1100, y: 250 },
  { x: 1100, y: 700 },
];
function ordered(points = path) {
  const sim = new Simulation(S0_LEVEL);
  const first = sim.getSnapshot().agents[0]!;
  sim.step([{ type: 'select-group', tick: 0, point: first }]);
  sim.step([{ type: 'set-formation', tick: 1, groupId: 'group-1', points }]);
  return sim;
}
it('moves all 40 continuously, within the speed cap, retaining IDs and membership', () => {
  const sim = ordered();
  const dt = S0_LEVEL.fixedStepMs / 1000;
  for (let tick = 0; tick < 700; tick++) {
    const before = sim.getSnapshot();
    sim.step();
    const after = sim.getSnapshot();
    assertInvariants(after);
    for (let i = 0; i < 40; i++) {
      const a = after.agents[i]!,
        b = before.agents[i]!;
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThanOrEqual(
        S0_LEVEL.movement.maxSpeed * dt + 1e-8,
      );
      expect(Math.hypot(a.vx, a.vy)).toBeLessThanOrEqual(S0_LEVEL.movement.maxSpeed + 1e-8);
      expect(a.id).toBe(b.id);
      expect(a.groupId).toBe(b.groupId);
    }
  }
  const state = sim.getSnapshot();
  const slots = state.groups[0]!.formation!.slots;
  for (const a of state.agents) {
    const slot = slots.find((s) => s.agentId === a.id)!;
    expect({ x: a.x, y: a.y }).toEqual({ x: slot.x, y: slot.y });
    expect(a.vx).toBe(0);
    expect(a.vy).toBe(0);
  }
  for (let i = 0; i < 300; i++) sim.step();
  expect(sim.getSnapshot().agents).toEqual(state.agents);
});
it('settles tightly packed and intersecting forms without perpetual jitter', () => {
  for (const points of [
    [
      { x: 600, y: 500 },
      { x: 624, y: 500 },
    ],
    [
      { x: 600, y: 300 },
      { x: 900, y: 600 },
      { x: 600, y: 600 },
      { x: 900, y: 300 },
    ],
  ]) {
    const sim = ordered(points);
    for (let i = 0; i < 1000; i++) sim.step();
    const state = sim.getSnapshot();
    assertInvariants(state);
    expect(state.agents.every((a) => a.vx === 0 && a.vy === 0)).toBe(true);
    for (let i = 0; i < 120; i++) sim.step();
    expect(sim.getSnapshot().agents).toEqual(state.agents);
  }
});
it('soft separation resolves coincident agents while preserving the speed bound', () => {
  const config = {
    ...S0_LEVEL,
    spawn: { ...S0_LEVEL.spawn, count: 2, columns: 2, spacing: 0, jitter: 0 },
  };
  const state = createInitialState(config);
  const control = createInitialState(config);
  const points = [
    { x: 600, y: 500 },
    { x: 630, y: 500 },
    { x: 600, y: 500 },
  ];
  for (const s of [state, control])
    s.groups[0]!.formation = createFormation(points, s.groups[0]!.agentIds)!;
  moveAgents(control, { ...config, movement: { ...config.movement, separationStrength: 0 } });
  moveAgents(state, config);
  expect(Math.abs(state.agents[0]!.x - state.agents[1]!.x)).toBeGreaterThan(
    Math.abs(control.agents[0]!.x - control.agents[1]!.x),
  );
  assertInvariants(state);
});
it('replacement orders cannot teleport and idle/deselected agents stay still', () => {
  const sim = ordered();
  for (let i = 0; i < 30; i++) sim.step();
  const before = sim.getSnapshot();
  sim.step([
    { type: 'set-formation', tick: sim.tick, groupId: 'group-1', points: [...path].reverse() },
  ]);
  const after = sim.getSnapshot();
  for (let i = 0; i < 40; i++)
    expect(
      Math.hypot(
        after.agents[i]!.x - before.agents[i]!.x,
        after.agents[i]!.y - before.agents[i]!.y,
      ),
    ).toBeLessThanOrEqual(3 + 1e-8);
  sim.step([{ type: 'select-group', tick: sim.tick, point: { x: 1500, y: 900 } }]);
  const stopped = sim.getSnapshot();
  for (let i = 0; i < 120; i++) sim.step();
  expect(sim.getSnapshot().agents).toEqual(stopped.agents);
  expect(stopped.agents.every((a) => a.vx === 0 && a.vy === 0)).toBe(true);
});
it('keeps centers in world bounds even for edge targets', () => {
  const sim = ordered([
    { x: 0, y: 0 },
    { x: 1600, y: 0 },
  ]);
  for (let i = 0; i < 1100; i++) {
    sim.step();
    if (i % 60 === 0) assertInvariants(sim.getSnapshot());
  }
  expect(sim.getSnapshot().agents.every((a) => a.vx === 0 && a.vy === 0)).toBe(true);
});
it('rejects invalid movement configuration', () => {
  for (const movement of [
    { ...S0_LEVEL.movement, maxSpeed: 0 },
    { ...S0_LEVEL.movement, arrivalGain: Infinity },
    { ...S0_LEVEL.movement, separationStrength: 1 },
  ])
    expect(() => new Simulation({ ...S0_LEVEL, movement })).toThrow('movement');
});
