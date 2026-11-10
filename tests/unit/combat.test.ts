import { describe, expect, it } from 'vitest';
import { GAME_LEVEL, S0_CLOCK } from '../../src/core/config';
import { Session } from '../../src/app/session';
import { createInitialState } from '../../src/simulation/initialState';
import { resolveCombat } from '../../src/simulation/combat';
import { assertInvariants } from '../../src/simulation/invariants';
import { Simulation } from '../../src/simulation/simulation';
import { enemyCommands } from '../../src/enemy/controller';

const combat = { range: 40, damage: 1, cooldownTicks: 10, hitFeedbackTicks: 3 };
const level = {
  ...GAME_LEVEL,
  spawn: {
    ...GAME_LEVEL.spawn,
    count: 2,
    columns: 2,
    centerX: 500,
    centerY: 500,
    spacing: 10,
    jitter: 0,
  },
  enemy: { ...GAME_LEVEL.enemy!, count: 1, columns: 1, centerX: 510, centerY: 500 },
  combat,
  initialHp: 3,
};

describe('enemy and combat', () => {
  it('uses simultaneous attacks and one strike per attacker per cooldown', () => {
    const state = createInitialState(level);
    resolveCombat(state, level);
    expect(state.agents.map((agent) => agent.hp)).toEqual([3, 2, 1]);
    resolveCombat(state, level);
    expect(state.agents.map((agent) => agent.hp)).toEqual([3, 2, 1]);
    state.tick = 10;
    resolveCombat(state, level);
    expect(state.agents[2]!.alive).toBe(false);
    expect(state.groups.some((group) => group.factionId === 'red')).toBe(false);
    assertInvariants(state);
  });

  it('cleans formation, selection and merge when agents die during movement or merging', () => {
    const state = createInitialState(level);
    const [first, second, red] = state.agents;
    first!.hp = 1;
    first!.x = red!.x;
    first!.y = red!.y;
    second!.x = 100;
    state.groups[0]!.agentIds = [first!.id];
    state.groups[0]!.formation = {
      points: [
        { x: 400, y: 500 },
        { x: 600, y: 500 },
      ],
      slots: [{ agentId: first!.id, index: 0, x: 500, y: 500 }],
    };
    second!.groupId = 'group-2';
    state.groups.push({ id: 'group-2', factionId: 'blue', agentIds: [second!.id] });
    state.selectedGroupId = 'group-1';
    state.merge = { first: 'group-1', second: 'group-2' };
    resolveCombat(state, level);
    expect(first!.alive).toBe(false);
    expect(state.selectedGroupId).toBeNull();
    expect(state.merge).toBeNull();
    expect(state.groups.some((group) => group.id === 'group-1')).toBe(false);
    assertInvariants(state);
  });

  it('cleans just the dead slot in an existing formation while preserving the survivors', () => {
    const state = createInitialState(level);
    const [first, second, red] = state.agents;
    first!.hp = 1;
    first!.x = red!.x;
    second!.x = 100;
    state.groups[0]!.formation = {
      points: [
        { x: 400, y: 500 },
        { x: 600, y: 500 },
      ],
      slots: [first!, second!].map((a, index) => ({
        agentId: a.id,
        index,
        x: 500 + index * 50,
        y: 500,
      })),
    };
    resolveCombat(state, level);
    expect(state.groups[0]!.agentIds).toEqual([second!.id]);
    expect(state.groups[0]!.formation!.slots.map((slot) => [slot.agentId, slot.index])).toEqual([
      [second!.id, 0],
    ]);
    assertInvariants(state);
  });

  it('defeat is unique, frozen and Restart restores the entire match', () => {
    const config = { ...level, spawn: { ...level.spawn, count: 1 }, initialHp: 1 };
    const session = new Session(config, S0_CLOCK);
    const initial = session.getSnapshot();
    const lost = session.advance(S0_CLOCK.stepMs);
    expect(lost.result).toBe('defeat');
    expect(lost.phase).toBe('finished');
    for (let i = 0; i < 20; i++) expect(session.advance(S0_CLOCK.stepMs)).toEqual(lost);
    session.submit('restart');
    expect(session.advance(0)).toEqual(initial);
  });

  it('controller and combat replay deterministically from seed and player commands', () => {
    const run = () => {
      const sim = new Simulation(GAME_LEVEL);
      const initial = sim.getSnapshot();
      expect(enemyCommands(initial, GAME_LEVEL)).toEqual(enemyCommands(initial, GAME_LEVEL));
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
      for (let i = 0; i < 1200; i++) {
        sim.step();
        assertInvariants(sim.getSnapshot());
      }
      return sim.getSnapshot();
    };
    const first = run();
    expect(first).toEqual(run());
    expect(first.agents.some((agent) => !agent.alive)).toBe(true);
  });
});

it('allows inspecting red groups without granting player formation or cut control', () => {
  const sim = new Simulation(GAME_LEVEL);
  sim.step([{ tick: 0, type: 'select-group-id', groupId: 'group-1000' }]);
  const selected = sim.getSnapshot();
  expect(selected.selectedGroupId).toBe('group-1000');
  const formation = selected.groups.find((group) => group.id === 'group-1000')!.formation;
  sim.step([
    {
      tick: 1,
      type: 'set-formation',
      groupId: 'group-1000',
      points: [
        { x: 10, y: 10 },
        { x: 500, y: 10 },
      ],
    },
  ]);
  sim.step([
    {
      tick: 2,
      type: 'cut',
      groupId: 'group-1000',
      points: [
        { x: 200, y: 0 },
        { x: 200, y: 1000 },
      ],
    },
  ]);
  expect(sim.getSnapshot().groups.find((group) => group.id === 'group-1000')!.formation).toEqual(
    formation,
  );
  sim.step([{ tick: 3, type: 'select-group-id', groupId: null }]);
  expect(sim.getSnapshot().groups.find((group) => group.id === 'group-1000')!.formation).toEqual(
    formation,
  );
});
