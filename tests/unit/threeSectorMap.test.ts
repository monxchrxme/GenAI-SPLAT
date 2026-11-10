import { expect, it } from 'vitest';
import { GAME_LEVEL } from '../../src/core/config';
import { Simulation } from '../../src/simulation/simulation';
import { enemyCommands } from '../../src/enemy/controller';
import { assertInvariants } from '../../src/simulation/invariants';
import { findRoute, pointBlocked, UNIT_CLEARANCE } from '../../src/simulation/obstacles';

it('starts independent enemy posts and two deviants in three sectors and restores them on restart', () => {
  const simulation = new Simulation(GAME_LEVEL);
  const initial = simulation.getSnapshot();
  const reds = initial.groups.filter((group) => group.factionId === 'red');
  expect(initial.world.width).toBe(6000);
  expect(reds.map((group) => group.agentIds.length)).toEqual([36, 24, 8, 8, 8, 8, 8, 1, 1]);
  expect(reds.map((group) => group.enemyPost)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  expect(
    initial.agents.every((agent) => !pointBlocked(agent, initial.obstacles, UNIT_CLEARANCE)),
  ).toBe(true);
  assertInvariants(initial);
  for (let i = 0; i < 180; i++) simulation.step();
  const after = simulation.getSnapshot();
  expect(after.groups.filter((group) => group.factionId === 'red')).toHaveLength(9);
  assertInvariants(after);
  expect(new Simulation(GAME_LEVEL).getSnapshot()).toEqual(initial);
});

it('keeps two independent traversable routes through each main barrier', () => {
  const world = GAME_LEVEL.world;
  const obstacles = GAME_LEVEL.obstacles!;
  for (const x of [1440, 3040]) {
    for (const y of [300, 700]) {
      expect(findRoute({ x: x - 150, y }, { x: x + 150, y }, world, obstacles)).toEqual([
        { x: x + 150, y },
      ]);
    }
  }
  for (const y of [250, 750])
    expect(findRoute({ x: 3900, y }, { x: 4750, y }, world, obstacles)).not.toBeNull();
});

it('responds to a split front at its own post without pulling distant posts together', () => {
  const initial = new Simulation(GAME_LEVEL).getSnapshot();
  const state = {
    ...initial,
    tick: 60,
    agents: initial.agents.map((agent, index) =>
      agent.factionId === 'blue' ? { ...agent, x: 1700, y: index < 20 ? 300 : 700 } : agent,
    ),
  };
  const commands = enemyCommands(state, GAME_LEVEL);
  expect(commands).toContainEqual({ type: 'enemy-split', tick: 60, groupId: 'group-1000' });
  expect(commands.filter((command) => command.type === 'enemy-split')).toHaveLength(1);
  expect(commands.some((command) => command.type === 'enemy-merge')).toBe(false);
  expect(commands.filter((command) => command.type === 'enemy-formation')).toHaveLength(8);
});

it('preserves a post identity when a garrison splits', () => {
  const sim = new Simulation(GAME_LEVEL);
  sim.step([{ type: 'enemy-split', tick: 0, groupId: 'group-1000' }]);
  const state = sim.getSnapshot();
  const split = state.groups.filter((group) => group.enemyPost === 0);
  expect(split.map((group) => group.agentIds.length)).toEqual([18, 18]);
  expect(state.groups.filter((group) => group.factionId === 'red')).toHaveLength(10);
  assertInvariants(state);
});

it('replays a real first-sector engagement while distant posts remain intact', () => {
  const run = () => {
    const sim = new Simulation(GAME_LEVEL);
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
    for (let i = 0; i < 1200; i++) sim.step();
    const state = sim.getSnapshot();
    assertInvariants(state);
    expect(
      state.agents.filter((agent) => agent.factionId === 'red' && !agent.alive).length,
    ).toBeGreaterThan(0);
    expect(
      state.groups
        .filter((group) => group.enemyPost !== undefined && group.enemyPost > 0)
        .reduce((sum, group) => sum + group.agentIds.length, 0),
    ).toBe(66);
    return state;
  };
  expect(run()).toEqual(run());
});

it('the final flank post closes in and damages a larger blue force, then pulls back when it leaves', () => {
  const level = {
    ...GAME_LEVEL,
    spawn: { ...GAME_LEVEL.spawn, count: 24, centerX: 5000, centerY: 220 },
  };
  const sim = new Simulation(level);
  const before = sim.getSnapshot();
  const flank = before.groups.find((group) => group.enemyPost === 4)!;
  for (let tick = 0; tick < 180; tick++) sim.step();
  const battle = sim.getSnapshot();
  const flankAgents = battle.agents.filter((agent) => agent.groupId === flank.id);
  expect(flankAgents.some((agent) => (agent.nextAttackTick ?? 0) > 0)).toBe(true);
  expect(
    battle.agents.some((agent) => agent.factionId === 'blue' && agent.hp < level.initialHp),
  ).toBe(true);
  expect(battle.agents.some((agent) => agent.factionId === 'blue' && agent.alive)).toBe(true);
  assertInvariants(battle);
  const withdrawn = {
    ...battle,
    agents: battle.agents.map((agent) =>
      agent.factionId === 'blue' ? { ...agent, x: 4700 } : agent,
    ),
  };
  const order = enemyCommands(withdrawn, level).find(
    (command) => 'groupId' in command && command.groupId === flank.id,
  );
  expect(order).toMatchObject({ type: 'enemy-formation' });
  if (order?.type !== 'enemy-formation') throw new Error('Missing flank post');
  expect(Math.min(...order.points.map((point) => point.x))).toBeGreaterThan(5150);
});
