import { expect, it } from 'vitest';
import { S0_CLOCK, S0_LEVEL } from '../../src/core/config';
import { createFormation } from '../../src/core/formation';
import { isStretched, tensionActive } from '../../src/core/tension';
import { Simulation } from '../../src/simulation/simulation';
import { Session } from '../../src/app/session';
import { FixedStepClock } from '../../src/core/fixedStepClock';
import { assertInvariants } from '../../src/simulation/invariants';
import { createInitialState } from '../../src/simulation/initialState';
import type { GameCommand, LevelConfig } from '../../src/core/types';

const long = [
  { x: 200, y: 100 },
  { x: 1400, y: 100 },
  { x: 1400, y: 900 },
];
const short = [
  { x: 650, y: 250 },
  { x: 1100, y: 250 },
  { x: 1100, y: 700 },
];
function selected(config: LevelConfig = S0_LEVEL) {
  const sim = new Simulation(config);
  const first = sim.getSnapshot().agents[0]!;
  sim.step([{ type: 'select-group', tick: 0, point: first }]);
  return sim;
}
it('measures neighboring target slots, with an exclusive threshold and no single-agent signal', () => {
  for (const [length, expected] of [
    [48, false],
    [49, true],
  ] as const) {
    const plan = createFormation(
      [
        { x: 100, y: 100 },
        { x: 100 + length, y: 100 },
      ],
      ['agent-1', 'agent-2'],
    )!;
    expect(isStretched(plan, S0_LEVEL.tension)).toBe(expected);
  }
  expect(isStretched(createFormation(long, ['agent-1'])!, S0_LEVEL.tension)).toBe(false);
});
it('starts on a valid order, lasts exactly the configured fixed ticks, then stays off', () => {
  const sim = selected();
  expect(tensionActive(sim.getSnapshot().groups[0], sim.tick)).toBe(false);
  sim.step([{ type: 'set-formation', tick: sim.tick, groupId: 'group-1', points: long }]);
  const snapshot = sim.getSnapshot();
  const group = snapshot.groups[0]!;
  expect(tensionActive(group, snapshot.tick)).toBe(true);
  expect(Reflect.set(group, 'tensionUntilTick', 99999)).toBe(false);
  const expiry = group.tensionUntilTick!;
  expect(expiry - sim.tick).toBe(S0_LEVEL.tension.durationTicks);
  for (let i = 1; i < S0_LEVEL.tension.durationTicks; i++) {
    sim.step();
    expect(tensionActive(sim.getSnapshot().groups[0], sim.tick)).toBe(true);
  }
  sim.step();
  expect(tensionActive(sim.getSnapshot().groups[0], sim.tick)).toBe(false);
  expect(sim.getSnapshot().agents.some((a) => a.vx !== 0 || a.vy !== 0)).toBe(true);
  for (let i = 0; i < 180; i++) sim.step();
  expect(tensionActive(sim.getSnapshot().groups[0], sim.tick)).toBe(false);
  expect(group.tensionUntilTick).toBe(expiry);
});
it('does not change movement, seed, membership or agent count; no automatic split', () => {
  const a = selected(),
    b = selected({ ...S0_LEVEL, tension: { ...S0_LEVEL.tension, neighborGap: 1e9 } });
  for (const sim of [a, b])
    sim.step([{ type: 'set-formation', tick: sim.tick, groupId: 'group-1', points: long }]);
  for (let i = 0; i < 720; i++) {
    a.step();
    b.step();
    if (i % 30 === 0) {
      const sa = a.getSnapshot(),
        sb = b.getSnapshot();
      expect(sa.agents).toEqual(sb.agents);
      expect(sa.rngState).toBe(sb.rngState);
      expect(sa.groups).toHaveLength(1);
      expect(sa.groups[0]?.agentIds).toHaveLength(40);
      expect(sa.agents.every((agent) => agent.alive)).toBe(true);
      assertInvariants(sa);
    }
  }
});
it('refreshes only on a new valid stretched order and clears on compact orders/deselection', () => {
  const sim = selected();
  const order = () =>
    sim.step([{ type: 'set-formation', tick: sim.tick, groupId: 'group-1', points: long }]);
  order();
  const expiry = sim.getSnapshot().groups[0]!.tensionUntilTick!;
  sim.step([{ type: 'set-formation', tick: sim.tick, groupId: 'group-1', points: [] }]);
  expect(sim.getSnapshot().groups[0]?.tensionUntilTick).toBe(expiry);
  order();
  expect(sim.getSnapshot().groups[0]!.tensionUntilTick).toBeGreaterThan(expiry);
  sim.step([{ type: 'set-formation', tick: sim.tick, groupId: 'group-1', points: short }]);
  expect(sim.getSnapshot().groups[0]?.tensionUntilTick).toBeUndefined();
  order();
  sim.step([{ type: 'select-group', tick: sim.tick, point: { x: 1500, y: 950 } }]);
  expect(sim.getSnapshot().groups[0]?.tensionUntilTick).toBeUndefined();
});
it('Restart during the signal clears it, the plan, movement and command log', () => {
  const session = new Session(S0_LEVEL, S0_CLOCK);
  const initial = session.getSnapshot();
  session.submit({ type: 'select-group', point: initial.agents[0]! });
  session.advance(S0_CLOCK.stepMs);
  session.submit({ type: 'set-formation', groupId: 'group-1', points: long });
  const state = session.advance(S0_CLOCK.stepMs);
  expect(tensionActive(state.groups[0], state.tick)).toBe(true);
  session.submit('restart');
  expect(session.advance(1000)).toEqual(initial);
  expect(session.commandLog).toEqual([]);
});
it('replays signal timing at 30/60/144 render FPS identically', () => {
  const first = createInitialState(S0_LEVEL).agents[0]!;
  const commands: GameCommand[] = [
    { type: 'select-group', tick: 0, point: first },
    { type: 'set-formation', tick: 1, groupId: 'group-1', points: long },
    { type: 'set-formation', tick: 100, groupId: 'group-1', points: [...long].reverse() },
  ];
  const results = [30, 60, 144].map((fps) => {
    const sim = new Simulation(S0_LEVEL),
      clock = new FixedStepClock(S0_CLOCK);
    for (let frame = 0; frame < fps * 2; frame++)
      clock.advance(1000 / fps, () => sim.step(commands.filter((c) => c.tick === sim.tick)));
    const state = sim.getSnapshot();
    expect(state.tick).toBe(120);
    expect(tensionActive(state.groups[0], state.tick)).toBe(true);
    return state;
  });
  expect(results[0]).toEqual(results[1]);
  expect(results[1]).toEqual(results[2]);
});
it('rejects invalid configuration and invalid signal state', () => {
  for (const tension of [
    { neighborGap: 0, durationTicks: 90 },
    { neighborGap: 48, durationTicks: 0 },
    { neighborGap: 48, durationTicks: 1.5 },
  ])
    expect(() => new Simulation({ ...S0_LEVEL, tension })).toThrow('tension');
  const state = createInitialState(S0_LEVEL);
  state.groups[0]!.tensionUntilTick = 1;
  expect(() => assertInvariants(state)).toThrow('tension');
});
