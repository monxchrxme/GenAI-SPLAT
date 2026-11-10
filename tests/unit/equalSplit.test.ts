import { expect, it } from 'vitest';
import { S0_LEVEL } from '../../src/core/config';
import { Simulation } from '../../src/simulation/simulation';
import { assertInvariants } from '../../src/simulation/invariants';

it.each([1, 2, 39, 40, 41])(
  'splits %i live agents as evenly as possible without requiring a formation',
  (count) => {
    const sim = new Simulation({ ...S0_LEVEL, spawn: { ...S0_LEVEL.spawn, count } });
    const initial = sim.getSnapshot();
    sim.step([
      { tick: 0, type: 'select-group-id', groupId: 'group-1' },
      { tick: 0, type: 'split', groupId: 'group-1' },
      { tick: 0, type: 'split', groupId: 'group-1' },
    ]);
    const after = sim.getSnapshot();
    expect(after.groups.map((group) => group.agentIds.length)).toEqual(
      count === 1 ? [1] : [Math.ceil(count / 2), Math.floor(count / 2)],
    );
    expect(after.agents.map((agent) => agent.id)).toEqual(initial.agents.map((agent) => agent.id));
    assertInvariants(after);
  },
);

it('preserves assigned destinations on an equal split while agents are moving', () => {
  const sim = new Simulation(S0_LEVEL);
  sim.step([
    { tick: 0, type: 'select-group-id', groupId: 'group-1' },
    {
      tick: 0,
      type: 'set-formation',
      groupId: 'group-1',
      points: [
        { x: 200, y: 200 },
        { x: 900, y: 200 },
      ],
    },
  ]);
  const before = sim.getSnapshot().groups[0]!.formation!.slots;
  sim.step([{ tick: 1, type: 'split', groupId: 'group-1' }]);
  const after = sim.getSnapshot();
  expect(
    after.groups.flatMap((group) =>
      group.formation!.slots.map(({ agentId, x, y }) => ({ agentId, x, y })),
    ),
  ).toEqual(before.map(({ agentId, x, y }) => ({ agentId, x, y })));
  assertInvariants(after);
});
