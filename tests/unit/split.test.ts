import { expect, it } from 'vitest';
import { S0_LEVEL } from '../../src/core/config';
import { Simulation } from '../../src/simulation/simulation';
import { assertInvariants } from '../../src/simulation/invariants';
import { createFormation } from '../../src/core/formation';
import { splitFormation } from '../../src/simulation/split';

const line = [
  { x: 200, y: 300 },
  { x: 980, y: 300 },
];
const cut = [
  { x: 590, y: 200 },
  { x: 590, y: 400 },
];

it('splits forty without losing agents, retains slots and supports independent orders', () => {
  const sim = new Simulation(S0_LEVEL);
  sim.step([
    { tick: 0, type: 'select-group-id', groupId: 'group-1' },
    { tick: 0, type: 'set-formation', groupId: 'group-1', points: line },
  ]);
  const before = sim.getSnapshot();
  sim.step([
    { tick: 1, type: 'cut', groupId: 'group-1', points: cut },
    { tick: 1, type: 'cut', groupId: 'group-1', points: cut },
  ]);
  const after = sim.getSnapshot();
  assertInvariants(after);
  expect(after.groups.map((g) => g.agentIds.length)).toEqual([20, 20]);
  expect(after.groups.map((g) => g.id)).toEqual(['group-2', 'group-3']);
  expect(after.selectedGroupId).toBe('group-2');
  expect(
    after.groups.flatMap((g) => g.formation!.slots.map(({ agentId, x, y }) => ({ agentId, x, y }))),
  ).toEqual(before.groups[0]!.formation!.slots.map(({ agentId, x, y }) => ({ agentId, x, y })));
  sim.step([
    { tick: 2, type: 'select-group-id', groupId: 'group-3' },
    {
      tick: 2,
      type: 'set-formation',
      groupId: 'group-3',
      points: [
        { x: 300, y: 700 },
        { x: 1000, y: 700 },
      ],
    },
  ]);
  const independent = sim.getSnapshot();
  assertInvariants(independent);
  expect(independent.groups[0]!.formation).toEqual(after.groups[0]!.formation);
  expect(independent.groups[1]!.formation!.points[0]!.y).toBe(700);
});

it('rejects a single agent, endpoints, exact slots, missed and multiple crossings', () => {
  const single = createFormation(line, ['agent-1'])!;
  expect(splitFormation(single, cut)).toBeNull();
  const form = createFormation(line, ['agent-1', 'agent-2', 'agent-3'])!;
  for (const path of [
    cut,
    [
      { x: 200, y: 200 },
      { x: 200, y: 400 },
    ],
    [
      { x: 100, y: 200 },
      { x: 100, y: 400 },
    ],
    [
      { x: 400, y: 200 },
      { x: 400, y: 400 },
      { x: 700, y: 400 },
      { x: 700, y: 200 },
    ],
  ])
    expect(splitFormation(form, path)).toBeNull();
  const edge = splitFormation(form, [
    { x: 300, y: 200 },
    { x: 300, y: 400 },
  ]);
  expect(edge?.map((part) => part.slots.length)).toEqual([1, 2]);
});

it('supports another cut on a shortened path and rejects a cut through a retained slot', () => {
  const original = createFormation(
    line,
    Array.from({ length: 40 }, (_, index) => `agent-${index + 1}` as const),
  )!;
  const parts = splitFormation(original, cut)!;
  const splitAgain = splitFormation(parts[0], [
    { x: 390, y: 200 },
    { x: 390, y: 400 },
  ]);
  expect(splitAgain?.map((part) => part.slots.length)).toEqual([10, 10]);
  expect(
    splitFormation(parts[0], [
      { x: 380, y: 200 },
      { x: 380, y: 400 },
    ]),
  ).toBeNull();
});
