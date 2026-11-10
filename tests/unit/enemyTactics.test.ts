import { DELIVERY2_LEVEL } from '../fixtures/delivery2Level';
import { expect, it } from 'vitest';
import { Simulation } from '../../src/simulation/simulation';
import { assertInvariants } from '../../src/simulation/invariants';

it('keeps both armies alive for one minute without player commands', () => {
  const sim = new Simulation(DELIVERY2_LEVEL);
  for (let tick = 0; tick < 3600; tick++) sim.step();
  const state = sim.getSnapshot();
  expect(state.result).toBeNull();
  expect(state.agents.filter((a) => a.alive && a.factionId === 'blue')).toHaveLength(40);
  expect(state.agents.filter((a) => a.alive && a.factionId === 'red')).toHaveLength(36);
  assertInvariants(state);
});

it('splits to cover separated blue squads and reunites after their merge', () => {
  const run = () => {
    const sim = new Simulation(DELIVERY2_LEVEL);
    sim.step([{ tick: 0, type: 'select-group-id', groupId: 'group-1' }]);
    sim.step([
      {
        tick: 1,
        type: 'set-formation',
        groupId: 'group-1',
        points: [
          { x: 200, y: 500 },
          { x: 980, y: 500 },
        ],
      },
    ]);
    sim.step([
      {
        tick: 2,
        type: 'cut',
        groupId: 'group-1',
        points: [
          { x: 590, y: 400 },
          { x: 590, y: 600 },
        ],
      },
    ]);
    sim.step([
      {
        tick: 3,
        type: 'set-formation',
        groupId: 'group-2',
        points: [
          { x: 200, y: 200 },
          { x: 980, y: 200 },
        ],
      },
    ]);
    sim.step([{ tick: 4, type: 'select-group-id', groupId: 'group-3' }]);
    sim.step([
      {
        tick: 5,
        type: 'set-formation',
        groupId: 'group-3',
        points: [
          { x: 200, y: 800 },
          { x: 980, y: 800 },
        ],
      },
    ]);
    for (; sim.tick < 600;) {
      sim.step();
      assertInvariants(sim.getSnapshot());
    }
    const divided = sim.getSnapshot();
    expect(divided.groups.filter((g) => g.factionId === 'red')).toHaveLength(2);
    expect(
      divided.groups
        .filter((g) => g.factionId === 'red')
        .reduce((sum, g) => sum + g.agentIds.length, 0),
    ).toBe(36);
    sim.step([{ tick: sim.tick, type: 'merge', groupId: 'group-3', targetGroupId: 'group-2' }]);
    for (; sim.tick < 1000;) {
      sim.step();
      assertInvariants(sim.getSnapshot());
    }
    expect(sim.getSnapshot().groups.filter((g) => g.factionId === 'blue')).toHaveLength(1);
    sim.step([
      {
        tick: sim.tick,
        type: 'set-formation',
        groupId: 'group-3',
        points: [
          { x: 450, y: 500 },
          { x: 520, y: 500 },
        ],
      },
    ]);
    for (; sim.tick < 1800;) {
      sim.step();
      assertInvariants(sim.getSnapshot());
    }
    const combined = sim.getSnapshot();
    expect(combined.groups.filter((g) => g.factionId === 'blue')).toHaveLength(1);
    expect(combined.groups.filter((g) => g.factionId === 'red')).toHaveLength(1);
    expect(combined.groups.find((g) => g.factionId === 'red')!.agentIds).toHaveLength(36);
    return combined;
  };
  expect(run()).toEqual(run());
});

it('a frontal assault causes losses on both sides', () => {
  const sim = new Simulation(DELIVERY2_LEVEL);
  sim.step([{ tick: 0, type: 'select-group-id', groupId: 'group-1' }]);
  sim.step([
    {
      tick: 1,
      type: 'set-formation',
      groupId: 'group-1',
      points: [
        { x: 1800, y: 450 },
        { x: 1950, y: 550 },
      ],
    },
  ]);
  for (let i = 0; i < 1500; i++) sim.step();
  const state = sim.getSnapshot();
  expect(state.agents.filter((a) => a.alive && a.factionId === 'blue').length).toBeLessThan(40);
  expect(state.agents.filter((a) => a.alive && a.factionId === 'red').length).toBeLessThan(36);
  assertInvariants(state);
});
