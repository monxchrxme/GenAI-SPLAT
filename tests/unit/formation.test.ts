import { expect, it } from 'vitest';
import { createFormation } from '../../src/core/formation';
import { S0_CLOCK, S0_LEVEL } from '../../src/core/config';
import { Session } from '../../src/app/session';
import { Simulation } from '../../src/simulation/simulation';
import { FixedStepClock } from '../../src/core/fixedStepClock';
import { assertInvariants } from '../../src/simulation/invariants';
import type { AgentId, GameCommand } from '../../src/core/types';

const path = [
  { x: 100, y: 100 },
  { x: 130, y: 100 },
  { x: 130, y: 130 },
];
const ids: AgentId[] = ['agent-5', 'agent-3', 'agent-1', 'agent-4', 'agent-2'];
it('distributes by arc length through a corner, including endpoints', () => {
  expect(createFormation(path, ids)?.slots.map(({ x, y }) => ({ x, y }))).toEqual([
    { x: 100, y: 100 },
    { x: 115, y: 100 },
    { x: 130, y: 100 },
    { x: 130, y: 115 },
    { x: 130, y: 130 },
  ]);
});
it('ignores duplicate samples and sampling density on the same path', () => {
  expect(
    createFormation(
      [path[0]!, path[0]!, { x: 110, y: 100 }, path[1]!, { x: 130, y: 110 }, path[2]!],
      ids,
    )?.slots,
  ).toEqual(createFormation(path, ids)?.slots);
});
it('uses arc midpoint for one agent and rejects invalid/degenerate geometry', () => {
  expect(
    createFormation(
      [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 30, y: 70 },
      ],
      ['agent-1'],
    )?.slots[0],
  ).toEqual({ agentId: 'agent-1', index: 0, x: 30, y: 20 });
  for (const invalid of [
    [],
    [{ x: 0, y: 0 }],
    [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ],
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ],
    [{ x: NaN, y: 0 }, path[1]!],
    [
      { x: 0, y: 0 },
      { x: 4000, y: 0 },
    ],
  ])
    expect(createFormation(invalid, ids)).toBeNull();
  expect(createFormation(path, [])).toBeNull();
  expect(createFormation(path, ['agent-1', 'agent-1'])).toBeNull();
});
it('keeps numeric ID-to-index stable despite reordered members or reversed line', () => {
  const a = createFormation(path, ids)!;
  const b = createFormation([...path].reverse(), [...ids].reverse())!;
  expect(a.slots.map((s) => s.agentId)).toEqual([
    'agent-1',
    'agent-2',
    'agent-3',
    'agent-4',
    'agent-5',
  ]);
  expect(a.slots.map((s) => [s.agentId, s.index])).toEqual(
    b.slots.map((s) => [s.agentId, s.index]),
  );
});
function selected() {
  const session = new Session(S0_LEVEL, S0_CLOCK);
  const first = session.getSnapshot().agents[0]!;
  session.submit({ type: 'select-group', point: first });
  session.advance(S0_CLOCK.stepMs);
  return session;
}
it('stores 40 assignments at fixed tick; payload and snapshot are detached/frozen', () => {
  const session = selected();
  const before = session.getSnapshot();
  const mutable = path.map((p) => ({ ...p }));
  session.submit({ type: 'set-formation', groupId: 'group-1', points: mutable });
  mutable[0]!.x = 999;
  expect(session.advance(0).groups[0]?.formation).toBeUndefined();
  const snapshot = session.advance(S0_CLOCK.stepMs);
  const plan = snapshot.groups[0]!.formation!;
  expect(plan.slots).toHaveLength(40);
  expect(new Set(plan.slots.map((s) => s.agentId)).size).toBe(40);
  expect(snapshot.agents.map(({ id, groupId, alive }) => ({ id, groupId, alive }))).toEqual(
    before.agents.map(({ id, groupId, alive }) => ({ id, groupId, alive })),
  );
  expect(before.groups[0]?.formation).toBeUndefined();
  expect(plan.points[0]?.x).toBe(100);
  expect(Reflect.set(plan.slots[0]!, 'x', 999)).toBe(false);
  const command = session.commandLog.at(-1)!;
  expect(command.type === 'set-formation' && Object.isFrozen(command.points[0])).toBe(true);
  session.submit({ type: 'set-formation', groupId: 'group-1', points: [...path].reverse() });
  session.advance(S0_CLOCK.stepMs);
  expect(plan.points[0]?.x).toBe(100);
  assertInvariants(snapshot);
});
it('ignores invalid/wrong-group requests; deselection and Restart clear plans', () => {
  const session = selected();
  const initial = new Session(S0_LEVEL, S0_CLOCK).getSnapshot();
  session.submit({ type: 'set-formation', groupId: 'group-1', points: path });
  const valid = session.advance(S0_CLOCK.stepMs).groups[0]?.formation;
  for (const points of [[], [{ x: -1, y: 0 }, path[1]!], [{ x: NaN, y: 0 }, path[1]!]]) {
    session.submit({ type: 'set-formation', groupId: 'group-1', points });
    expect(session.advance(S0_CLOCK.stepMs).groups[0]?.formation).toEqual(valid);
  }
  session.submit({ type: 'set-formation', groupId: 'group-999', points: path });
  expect(session.advance(S0_CLOCK.stepMs).groups[0]?.formation).toEqual(valid);
  session.submit({ type: 'select-group', point: { x: 1500, y: 900 } });
  expect(session.advance(S0_CLOCK.stepMs).groups[0]?.formation).toBeUndefined();
  session.submit('restart');
  expect(session.advance(0)).toEqual(initial);
  expect(session.commandLog).toEqual([]);
});
it('replays formation commands identically at 30/60/144 render FPS', () => {
  const first = new Simulation(S0_LEVEL).getSnapshot().agents[0]!;
  const commands: GameCommand[] = [
    { type: 'select-group', tick: 0, point: first },
    { type: 'set-formation', tick: 1, groupId: 'group-1', points: path },
    { type: 'set-formation', tick: 10, groupId: 'group-1', points: [...path].reverse() },
  ];
  const results = [30, 60, 144].map((fps) => {
    const sim = new Simulation(S0_LEVEL);
    const clock = new FixedStepClock(S0_CLOCK);
    for (let frame = 0; frame < 2 * fps; frame++)
      clock.advance(1000 / fps, () => sim.step(commands.filter((c) => c.tick === sim.tick)));
    expect(sim.tick).toBe(120);
    assertInvariants(sim.getSnapshot());
    return sim.getSnapshot();
  });
  expect(results[0]).toEqual(results[1]);
  expect(results[1]).toEqual(results[2]);
});
