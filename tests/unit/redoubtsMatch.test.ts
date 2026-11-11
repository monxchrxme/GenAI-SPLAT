import { expect, it } from 'vitest';
import { Session } from '../../src/app/session';
import { S0_CLOCK } from '../../src/core/config';
import { REDOUBTS } from '../../src/levels/redoubts';
import { Simulation } from '../../src/simulation/simulation';
import { assertInvariants } from '../../src/simulation/invariants';
import { REDOUBTS_ROUTE } from '../fixtures/redoubtsRoute';

it('wins through three courtyards, earns deviant rewards, replays and restarts the actual map', () => {
  const session = new Session(REDOUBTS, S0_CLOCK);
  const initial = session.getSnapshot();
  session.submit({ type: 'select-group-id', groupId: 'group-1' });
  let spent = 0;
  for (const stage of REDOUBTS_ROUTE) {
    for (const [x, y, seconds, height = 120] of stage.points) {
      session.submit({
        type: 'set-formation',
        groupId: 'group-1',
        points: [
          { x, y: y - height / 2 },
          { x, y: y + height / 2 },
        ],
      });
      for (let tick = 0; tick < seconds * 60; tick++) session.advance(S0_CLOCK.stepMs);
    }
    let state = session.getSnapshot();
    expect(state.checkpoints.filter((point) => point.captured).length, stage.name).toBe(
      stage.checkpoints,
    );
    expect(
      state.agents.filter((agent) => agent.alive && agent.variant === 'deviant').length,
      stage.name,
    ).toBe(stage.deviants);
    const earned = state.agents.reduce(
      (sum, agent) =>
        sum +
        (!agent.alive && agent.factionId === 'red' ? (agent.variant === 'deviant' ? 7 : 1) : 0),
      0,
    );
    expect(state.reinforcementCredits).toBe(earned - spent);
    assertInvariants(state);
    if (stage.refill) {
      while (
        state.reinforcementCredits >= 5 &&
        state.agents.filter((agent) => agent.alive && agent.factionId === 'blue').length < 40
      ) {
        const before = state.reinforcementCredits;
        session.submit({ type: 'reinforce', groupId: 'group-1' });
        state = session.advance(S0_CLOCK.stepMs);
        expect(state.reinforcementCredits).toBe(before - 5);
        spent += 5;
      }
    }
  }
  const won = session.getSnapshot();
  expect(won.result).toBe('victory');
  expect(won.objective!.captured).toBe(true);
  const survivors = won.agents.filter((agent) => agent.alive && agent.factionId === 'blue').length;
  expect(survivors).toBeGreaterThanOrEqual(20);
  expect(survivors).toBeLessThan(40);
  expect(won.agents.some((agent) => agent.alive && agent.factionId === 'red')).toBe(true);
  const byTick = new Map<number, typeof session.commandLog>();
  for (const command of session.commandLog)
    byTick.set(command.tick, [...(byTick.get(command.tick) ?? []), command]);
  const replay = new Simulation(REDOUBTS);
  while (replay.tick < won.tick) replay.step(byTick.get(replay.tick) ?? []);
  expect(replay.getSnapshot()).toEqual(won);
  session.submit({ type: 'move-group', groupId: 'group-1', point: { x: 430, y: 500 } });
  expect(session.advance(S0_CLOCK.stepMs)).toEqual(won);
  session.submit('restart');
  expect(session.advance(0)).toEqual(initial);
  expect(session.commandLog).toEqual([]);
}, 60000);
