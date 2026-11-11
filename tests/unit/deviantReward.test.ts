import { expect, it } from 'vitest';
import { Session } from '../../src/app/session';
import { GAME_LEVEL, S0_CLOCK, S0_LEVEL } from '../../src/core/config';
import { LEVELS } from '../../src/levels/catalog';
import { applyDamage } from '../../src/simulation/combat';
import { createInitialState } from '../../src/simulation/initialState';
import { assertInvariants } from '../../src/simulation/invariants';
import { Simulation } from '../../src/simulation/simulation';

it.each(LEVELS)(
  '$title awards seven credits per deviant and one per ordinary red, once',
  ({ config }) => {
    const state = createInitialState(config);
    const deviants = state.agents.filter((agent) => agent.variant === 'deviant');
    const red = state.agents.find((agent) => agent.factionId === 'red' && !agent.variant)!;
    const blue = state.agents.find((agent) => agent.factionId === 'blue')!;
    const damage = new Map([...deviants, red, blue].map((agent) => [agent.id, agent.hp + 100]));
    applyDamage(state, damage, config);
    expect(state.reinforcementCredits).toBe(deviants.length * 7 + 1);
    expect([...deviants, red, blue].every((agent) => !agent.alive)).toBe(true);
    applyDamage(state, damage, config);
    expect(state.reinforcementCredits).toBe(deviants.length * 7 + 1);
    assertInvariants(state);
  },
);

it('makes the reward spendable on the next command, replays and resets cleanly', () => {
  const config = {
    ...S0_LEVEL,
    initialHp: 1,
    spawn: { ...S0_LEVEL.spawn, count: 2, columns: 2, centerX: 500, spacing: 10, jitter: 0 },
    enemy: GAME_LEVEL.enemy!,
    enemyPosts: [
      { count: 1, columns: 1, centerX: 520, centerY: 500, deviant: true },
      { count: 1, columns: 1, centerX: 1300, centerY: 500 },
    ],
    deviant: { ...GAME_LEVEL.deviant!, hp: 1 },
    combat: { ...GAME_LEVEL.combat!, range: 80 },
    reinforcement: GAME_LEVEL.reinforcement!,
  };
  const session = new Session(config, S0_CLOCK);
  const initial = session.getSnapshot();
  session.submit({ type: 'select-group-id', groupId: 'group-1' });
  const fought = session.advance(S0_CLOCK.stepMs);
  expect(fought.agents.find((agent) => agent.variant === 'deviant')!.alive).toBe(false);
  expect(fought.reinforcementCredits).toBe(7);
  expect(fought.agents.filter((agent) => agent.alive && agent.factionId === 'blue')).toHaveLength(
    1,
  );
  session.submit({ type: 'reinforce', groupId: 'group-1' });
  const reinforced = session.advance(S0_CLOCK.stepMs);
  expect(reinforced.reinforcementCredits).toBe(2);
  expect(
    reinforced.agents.filter((agent) => agent.alive && agent.factionId === 'blue'),
  ).toHaveLength(3);
  assertInvariants(reinforced);
  const replay = new Simulation(config);
  while (replay.tick < reinforced.tick)
    replay.step(session.commandLog.filter((command) => command.tick === replay.tick));
  expect(replay.getSnapshot()).toEqual(reinforced);
  session.submit('restart');
  expect(session.advance(0)).toEqual(initial);
  expect(session.commandLog).toEqual([]);
});

it('preserves the old one-credit reward when a legacy configuration omits the new setting', () => {
  const config = { ...GAME_LEVEL, reinforcement: { cost: 5, count: 2, maxBlue: 40 } };
  const state = createInitialState(config);
  const deviant = state.agents.find((agent) => agent.variant === 'deviant')!;
  applyDamage(state, new Map([[deviant.id, deviant.hp]]), config);
  expect(state.reinforcementCredits).toBe(1);
});

it('rejects a fractional reward that would break integer resource accounting', () => {
  expect(
    () =>
      new Simulation({
        ...GAME_LEVEL,
        reinforcement: { ...GAME_LEVEL.reinforcement!, deviantReward: 0.5 },
      }),
  ).toThrow('Invalid reinforcement configuration');
});
