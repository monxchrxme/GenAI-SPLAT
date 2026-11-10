import { expect, it } from 'vitest';
import { GAME_LEVEL, S0_LEVEL } from '../../src/core/config';
import { enemyCommands } from '../../src/enemy/controller';
import { resolveCombat } from '../../src/simulation/combat';
import { createInitialState } from '../../src/simulation/initialState';
import { Simulation } from '../../src/simulation/simulation';
import { assertInvariants } from '../../src/simulation/invariants';

const level = {
  ...S0_LEVEL,
  spawn: { ...S0_LEVEL.spawn, centerX: 660, centerY: 500, jitter: 0 },
  initialHp: 10,
  enemy: { ...GAME_LEVEL.enemy!, centerX: 900, centerY: 500 },
  enemyPosts: [{ count: 1, columns: 1, centerX: 900, centerY: 500, deviant: true }],
  deviant: GAME_LEVEL.deviant!,
};

it('moves toward the nearest blue unit despite a numerical disadvantage and replays', () => {
  const run = () => {
    const sim = new Simulation(level);
    const before = sim.getSnapshot();
    for (let i = 0; i < 8; i++) sim.step();
    const after = sim.getSnapshot();
    const start = before.agents.find((a) => a.variant === 'deviant')!;
    const moved = after.agents.find((a) => a.variant === 'deviant')!;
    expect(moved.x).toBeLessThan(start.x - 10);
    expect(after.groups.find((g) => g.enemyPost === 0)?.agentIds).toEqual([start.id]);
    assertInvariants(after);
    return after;
  };
  expect(run()).toEqual(run());
});

it('returns to its post without a nearby target and does not pursue beyond its leash', () => {
  const state = new Simulation(level).getSnapshot();
  const distant = {
    ...state,
    agents: state.agents.map((agent) =>
      agent.variant === 'deviant' ? { ...agent, x: 800 } : { ...agent, x: 100 },
    ),
  };
  const order = enemyCommands(distant, level).find((command) => command.type === 'enemy-formation');
  expect(order?.type).toBe('enemy-formation');
  if (order?.type !== 'enemy-formation') throw new Error('Missing deviant order');
  expect((order.points[0]!.x + order.points[1]!.x) / 2).toBe(900);
  const near = {
    ...state,
    agents: state.agents.map((agent) =>
      agent.variant === 'deviant' ? agent : { ...agent, x: 600, y: 500 },
    ),
  };
  const pursuit = enemyCommands(near, level).find((command) => command.type === 'enemy-formation');
  if (pursuit?.type !== 'enemy-formation') throw new Error('Missing deviant pursuit');
  expect((pursuit.points[0]!.x + pursuit.points[1]!.x) / 2).toBe(660);
});

it('attacks an approaching blue unit using the configured deviant cooldown', () => {
  const duel = {
    ...level,
    spawn: { ...level.spawn, count: 1, columns: 1, centerX: 850 },
    combat: GAME_LEVEL.combat!,
  };
  const sim = new Simulation(duel);
  for (let i = 0; i < 80; i++) sim.step();
  const state = sim.getSnapshot();
  expect(state.agents.find((agent) => agent.factionId === 'blue')!.hp).toBeLessThan(10);
  assertInvariants(state);
});

it('moves a deviant on the actual final sector while ordinary post membership remains intact', () => {
  const actualLevel = {
    ...GAME_LEVEL,
    spawn: { ...GAME_LEVEL.spawn, centerX: 5300, centerY: 300 },
  };
  const sim = new Simulation(actualLevel);
  const before = sim.getSnapshot();
  const defender = before.agents.find((agent) => agent.variant === 'deviant' && agent.y === 300)!;
  for (let i = 0; i < 8; i++) sim.step();
  const after = sim.getSnapshot();
  expect(after.agents.find((agent) => agent.id === defender.id)!.x).toBeLessThan(defender.x);
  const ordinaryBefore = before.agents.filter(
    (agent) => agent.factionId === 'red' && !agent.variant,
  );
  const ordinaryAfter = after.agents.filter((agent) => agent.factionId === 'red' && !agent.variant);
  expect(ordinaryAfter.map((agent) => agent.id)).toEqual(ordinaryBefore.map((agent) => agent.id));
  assertInvariants(after);
});

it('survives a concentrated opening volley, but falls if the squad maintains contact', () => {
  const config = { ...level, combat: GAME_LEVEL.combat! };
  const state = createInitialState(config);
  const defender = state.agents.find((agent) => agent.variant === 'deviant')!;
  const blues = state.agents.filter((agent) => agent.factionId === 'blue');
  blues.forEach((agent, index) =>
    Object.assign(agent, { x: index < 6 ? defender.x - 20 : 100, y: defender.y }),
  );
  resolveCombat(state, config);
  expect(defender.alive).toBe(true);
  expect(defender.hp).toBe(config.deviant.hp - 6);
  expect(blues.some((agent) => agent.hp < config.initialHp)).toBe(true);
  state.tick = config.combat.cooldownTicks;
  resolveCombat(state, config);
  expect(defender.alive).toBe(false);
});
