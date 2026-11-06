import { expect, it } from 'vitest';
import { S0_CLOCK, S0_LEVEL } from '../../src/core/config';
import { Session } from '../../src/app/session';
import { Simulation } from '../../src/simulation/simulation';
import { assertInvariants } from '../../src/simulation/invariants';
import type { Point, Snapshot } from '../../src/core/types';

const path: Point[] = [
  { x: 250, y: 200 },
  { x: 1250, y: 200 },
  { x: 1250, y: 500 },
  { x: 700, y: 500 },
  { x: 700, y: 800 },
];
function unchangedArmy(before: Snapshot, after: Snapshot) {
  assertInvariants(after);
  expect(after.groups).toHaveLength(1);
  expect(after.groups[0]!.agentIds).toEqual(before.groups[0]!.agentIds);
  expect(
    after.agents.map(({ id, groupId, factionId, hp, alive }) => ({
      id,
      groupId,
      factionId,
      hp,
      alive,
    })),
  ).toEqual(
    before.agents.map(({ id, groupId, factionId, hp, alive }) => ({
      id,
      groupId,
      factionId,
      hp,
      alive,
    })),
  );
  expect(after.rngState).toBe(before.rngState);
}

it('QA-01: forty agents settle on a three-corner path, retain identity and remain at rest', () => {
  const sim = new Simulation(S0_LEVEL);
  const initial = sim.getSnapshot();
  sim.step([
    { type: 'select-group-id', tick: 0, groupId: 'group-1' },
    { type: 'set-formation', tick: 0, groupId: 'group-1', points: path },
  ]);
  let before = initial;
  for (let i = 0; i < 1000; i++) {
    const state = sim.getSnapshot();
    unchangedArmy(initial, state);
    for (let j = 0; j < 40; j++) {
      const a = state.agents[j]!,
        b = before.agents[j]!;
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThanOrEqual(3 + 1e-8);
    }
    before = state;
    sim.step();
  }
  const settled = sim.getSnapshot();
  expect(settled.groups[0]!.formation!.points).toEqual(path);
  const slots = settled.groups[0]!.formation!.slots;
  expect(new Set(slots.map((s) => s.agentId)).size).toBe(40);
  for (const agent of settled.agents) {
    const slot = slots.find((s) => s.agentId === agent.id)!;
    expect([agent.x, agent.y, agent.vx, agent.vy]).toEqual([slot.x, slot.y, 0, 0]);
  }
  for (let i = 0; i < 600; i++) sim.step();
  expect(sim.getSnapshot().agents).toEqual(settled.agents);
  expect(initial).toEqual(new Simulation(S0_LEVEL).getSnapshot());
});

it('QA-07: mixed rapid valid/invalid orders keep the last valid target; stop/reselect/restart are clean', () => {
  const session = new Session(S0_LEVEL, S0_CLOCK);
  const initial = session.getSnapshot();
  session.submit({ type: 'select-group-id', groupId: 'group-1' });
  for (let batch = 0; batch < 30; batch++) {
    const target = batch % 2 ? [...path].reverse() : path;
    for (const points of [
      target,
      [],
      [target[0]!],
      [{ x: NaN, y: 0 }, target[0]!],
      [{ x: -1, y: 0 }, target[0]!],
    ])
      session.submit({ type: 'set-formation', groupId: 'group-1', points });
    const state = session.advance(S0_CLOCK.stepMs);
    unchangedArmy(initial, state);
    expect(state.groups[0]!.formation!.points).toEqual(target);
  }
  session.submit({ type: 'select-group-id', groupId: null });
  const stopped = session.advance(S0_CLOCK.stepMs);
  expect(stopped.groups[0]!.formation).toBeUndefined();
  expect(stopped.groups[0]!.tensionUntilTick).toBeUndefined();
  expect(session.advance(200).agents).toEqual(stopped.agents);
  session.submit({ type: 'select-group-id', groupId: 'group-1' });
  session.submit({ type: 'set-formation', groupId: 'group-1', points: path });
  expect(session.advance(S0_CLOCK.stepMs).groups[0]!.formation!.points).toEqual(path);
  session.submit({ type: 'set-formation', groupId: 'group-1', points: [...path].reverse() });
  session.submit('restart');
  expect(session.advance(200)).toEqual(initial);
  expect(session.commandLog).toEqual([]);
  expect(session.advance(S0_CLOCK.stepMs / 2)).toEqual(initial);
});
