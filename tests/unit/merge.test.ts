import { expect, it } from 'vitest';
import { S0_LEVEL } from '../../src/core/config';
import { Simulation } from '../../src/simulation/simulation';
import { createInitialState } from '../../src/simulation/initialState';
import { assertInvariants } from '../../src/simulation/invariants';
import { advanceMerge, startMerge } from '../../src/simulation/merge';

it('merges 15 and 25 after convergence once, clears targets and permits another cut', () => {
  const sim = new Simulation(S0_LEVEL);
  sim.step([
    { tick: 0, type: 'select-group-id', groupId: 'group-1' },
    {
      tick: 0,
      type: 'set-formation',
      groupId: 'group-1',
      points: [
        { x: 200, y: 300 },
        { x: 980, y: 300 },
      ],
    },
  ]);
  sim.step([
    {
      tick: 1,
      type: 'cut',
      groupId: 'group-1',
      points: [
        { x: 490, y: 200 },
        { x: 490, y: 400 },
      ],
    },
  ]);
  for (let i = 0; i < 800; i++) sim.step();
  const before = sim.getSnapshot();
  expect(before.groups.map((g) => g.agentIds.length)).toEqual([15, 25]);
  const tick = before.tick;
  sim.step([
    { tick, type: 'merge', groupId: 'group-2', targetGroupId: 'group-3' },
    { tick, type: 'merge', groupId: 'group-2', targetGroupId: 'group-3' },
  ]);
  expect(sim.getSnapshot().groups).toHaveLength(2);
  expect(sim.getSnapshot().merge).not.toBeNull();
  for (let i = 0; i < 1000 && sim.getSnapshot().merge; i++) sim.step();
  const merged = sim.getSnapshot();
  assertInvariants(merged);
  expect(merged.groups).toHaveLength(1);
  expect(merged.groups[0]!.id).toBe('group-2');
  expect(merged.groups[0]!.agentIds).toHaveLength(40);
  expect(merged.groups[0]!.formation).toBeUndefined();
  expect(merged.merge).toBeNull();
  sim.step([
    {
      tick: merged.tick,
      type: 'set-formation',
      groupId: 'group-2',
      points: [
        { x: 200, y: 500 },
        { x: 980, y: 500 },
      ],
    },
  ]);
  sim.step([
    {
      tick: merged.tick + 1,
      type: 'cut',
      groupId: 'group-2',
      points: [
        { x: 490, y: 400 },
        { x: 490, y: 600 },
      ],
    },
  ]);
  assertInvariants(sim.getSnapshot());
  expect(sim.getSnapshot().groups.map((g) => g.agentIds.length)).toEqual([15, 25]);
});

it('rejects same, missing, empty and enemy groups and tolerates a death fixture', () => {
  const state = createInitialState(S0_LEVEL);
  state.selectedGroupId = 'group-1';
  const ids = state.groups[0]!.agentIds.splice(15);
  state.groups.push({ id: 'group-2', factionId: 'red', agentIds: ids });
  for (const agent of state.agents)
    if (ids.includes(agent.id)) {
      agent.groupId = 'group-2';
      agent.factionId = 'red';
    }
  startMerge(state, 'group-1', 'group-1');
  startMerge(state, 'group-1', 'group-9');
  startMerge(state, 'group-1', 'group-2');
  expect(state.merge).toBeNull();
  state.groups[1]!.factionId = 'blue';
  for (const agent of state.agents) agent.factionId = 'blue';
  startMerge(state, 'group-1', 'group-2');
  const casualty = state.agents.find((a) => a.groupId === 'group-2')!;
  casualty.alive = false;
  state.groups[1]!.agentIds = state.groups[1]!.agentIds.filter((id) => id !== casualty.id);
  advanceMerge(state, 10000, 45);
  assertInvariants(state);
  expect(state.groups[0]!.agentIds).toHaveLength(39);
  expect(state.groups[0]!.agentIds).not.toContain(casualty.id);
  const empty = createInitialState(S0_LEVEL);
  empty.selectedGroupId = 'group-1';
  empty.groups.push({ id: 'group-2', factionId: 'blue', agentIds: [] });
  startMerge(empty, 'group-1', 'group-2');
  expect(empty.merge).toBeNull();
});

it('empty click stops an active merge', () => {
  const sim = new Simulation(S0_LEVEL);
  sim.step([
    { tick: 0, type: 'select-group-id', groupId: 'group-1' },
    {
      tick: 0,
      type: 'set-formation',
      groupId: 'group-1',
      points: [
        { x: 200, y: 300 },
        { x: 980, y: 300 },
      ],
    },
  ]);
  sim.step([
    {
      tick: 1,
      type: 'cut',
      groupId: 'group-1',
      points: [
        { x: 490, y: 200 },
        { x: 490, y: 400 },
      ],
    },
  ]);
  for (let i = 0; i < 800; i++) sim.step();
  let tick = sim.tick;
  sim.step([{ tick, type: 'merge', groupId: 'group-2', targetGroupId: 'group-3' }]);
  expect(sim.getSnapshot().merge).not.toBeNull();
  tick = sim.tick;
  sim.step([{ tick, type: 'select-group-id', groupId: null }]);
  expect(sim.getSnapshot().merge).toBeNull();
  expect(sim.getSnapshot().groups).toHaveLength(2);
});
