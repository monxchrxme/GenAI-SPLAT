import { DELIVERY2_LEVEL } from '../fixtures/delivery2Level';
import { expect, it } from 'vitest';
import { Session } from '../../src/app/session';
import { S0_CLOCK } from '../../src/core/config';
import { assertInvariants } from '../../src/simulation/invariants';
import { Simulation } from '../../src/simulation/simulation';

const level = {
  ...DELIVERY2_LEVEL,
  enemy: {
    ...DELIVERY2_LEVEL.enemy!,
    count: 10,
    columns: 5,
    centerX: 430,
    centerY: 500,
    spacing: 20,
    decisionTicks: 10000,
  },
  combat: { ...DELIVERY2_LEVEL.combat!, range: 80, cooldownTicks: 1 },
};

it('earns credits only from kills, spends them once to restore a selected blue group and resets cleanly', () => {
  const session = new Session(level, S0_CLOCK);
  const initial = session.getSnapshot();
  for (let i = 0; i < 30; i++) session.advance(S0_CLOCK.stepMs);
  const fought = session.getSnapshot();
  const before = fought.agents.filter((agent) => agent.alive && agent.factionId === 'blue').length;
  const killed = fought.agents.filter((agent) => !agent.alive && agent.factionId === 'red').length;
  expect(fought.reinforcementCredits).toBe(killed);
  expect(killed).toBeGreaterThanOrEqual(5);
  expect(before).toBeLessThanOrEqual(38);
  session.submit({ type: 'reinforce', groupId: 'group-1' });
  const unselected = session.advance(S0_CLOCK.stepMs);
  expect(unselected.reinforcementCredits).toBe(killed);
  expect(
    unselected.agents.filter((agent) => agent.alive && agent.factionId === 'blue'),
  ).toHaveLength(before);
  session.submit({ type: 'select-group-id', groupId: 'group-1' });
  session.submit({ type: 'reinforce', groupId: 'group-1' });
  const after = session.advance(S0_CLOCK.stepMs);
  expect(after.agents.filter((agent) => agent.alive && agent.factionId === 'blue')).toHaveLength(
    Math.min(40, before + 2),
  );
  expect(after.reinforcementCredits).toBe(killed - 5);
  expect(new Set(after.agents.map((agent) => agent.id)).size).toBe(after.agents.length);
  assertInvariants(after);
  const replay = new Simulation(level);
  const log = session.commandLog;
  while (replay.tick < after.tick)
    replay.step(log.filter((command) => command.tick === replay.tick));
  expect(replay.getSnapshot()).toEqual(after);
  for (let i = 0; i < 5; i++) {
    session.submit({ type: 'reinforce', groupId: 'group-1' });
    const state = session.advance(S0_CLOCK.stepMs);
    expect(
      state.agents.filter((agent) => agent.alive && agent.factionId === 'blue').length,
    ).toBeLessThanOrEqual(40);
    assertInvariants(state);
  }
  const beforeRestart = session.getSnapshot();
  if (
    beforeRestart.agents.filter((agent) => agent.alive && agent.factionId === 'blue').length === 40
  ) {
    session.submit({ type: 'reinforce', groupId: 'group-1' });
    const atCap = session.advance(S0_CLOCK.stepMs);
    expect(atCap.reinforcementCredits).toBe(beforeRestart.reinforcementCredits);
  }
  session.submit('restart');
  expect(session.advance(0)).toEqual(initial);
  expect(session.commandLog).toEqual([]);
});

it('does not spend or create agents without credits, a selected blue group, or available capacity', () => {
  const session = new Session(DELIVERY2_LEVEL, S0_CLOCK);
  session.submit({ type: 'reinforce', groupId: 'group-1' });
  const state = session.advance(S0_CLOCK.stepMs);
  expect(state.reinforcementCredits).toBeLessThan(5);
  expect(state.agents.filter((agent) => agent.factionId === 'blue')).toHaveLength(40);
  assertInvariants(state);
});

it('an equal split remains valid during combat losses', () => {
  const session = new Session(level, S0_CLOCK);
  session.submit({ type: 'select-group-id', groupId: 'group-1' });
  session.submit({ type: 'split', groupId: 'group-1' });
  for (let i = 0; i < 30; i++) {
    session.advance(S0_CLOCK.stepMs);
    assertInvariants(session.getSnapshot());
  }
  const state = session.getSnapshot();
  expect(state.groups.filter((group) => group.factionId === 'blue')).toHaveLength(2);
  expect(state.agents.some((agent) => agent.factionId === 'blue' && !agent.alive)).toBe(true);
});
