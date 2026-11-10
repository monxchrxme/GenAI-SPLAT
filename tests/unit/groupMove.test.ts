import { expect, it } from 'vitest';
import { Session } from '../../src/app/session';
import { GAME_LEVEL, S0_CLOCK, S0_LEVEL } from '../../src/core/config';
import { Simulation } from '../../src/simulation/simulation';
import { assertInvariants } from '../../src/simulation/invariants';
import { pointBlocked, UNIT_CLEARANCE } from '../../src/simulation/obstacles';

it('translates the current positions around their center, keeps selection and replays', () => {
  const session = new Session(S0_LEVEL, S0_CLOCK);
  session.submit({ type: 'select-group-id', groupId: 'group-1' });
  session.submit({
    type: 'set-formation',
    groupId: 'group-1',
    points: [
      { x: 700, y: 200 },
      { x: 1100, y: 700 },
    ],
  });
  for (let i = 0; i < 60; i++) session.advance(S0_CLOCK.stepMs);
  const before = session.getSnapshot();
  const center = {
    x: before.agents.reduce((sum, agent) => sum + agent.x, 0) / before.agents.length,
    y: before.agents.reduce((sum, agent) => sum + agent.y, 0) / before.agents.length,
  };
  const point = { x: 1000, y: 500 };
  session.submit({ type: 'move-group', groupId: 'group-1', point });
  point.x = 0;
  const after = session.advance(S0_CLOCK.stepMs);
  expect(after.selectedGroupId).toBe('group-1');
  const slots = after.groups[0]!.formation!.slots;
  for (const slot of slots) {
    const agent = before.agents.find((a) => a.id === slot.agentId)!;
    expect(slot.x).toBeCloseTo(agent.x + 1000 - center.x, 8);
    expect(slot.y).toBeCloseTo(agent.y + 500 - center.y, 8);
  }
  assertInvariants(after);
  const replay = new Simulation(S0_LEVEL);
  while (replay.tick < after.tick)
    replay.step(session.commandLog.filter((command) => command.tick === replay.tick));
  expect(replay.getSnapshot()).toEqual(after);
});

it('adjusts obstructed slots and keeps the old order for invalid coordinates or another group', () => {
  const session = new Session(GAME_LEVEL, S0_CLOCK);
  session.submit({ type: 'select-group-id', groupId: 'group-1' });
  session.submit({
    type: 'set-formation',
    groupId: 'group-1',
    points: [
      { x: 700, y: 300 },
      { x: 900, y: 300 },
    ],
  });
  const before = session.advance(S0_CLOCK.stepMs).groups.find((g) => g.id === 'group-1')!.formation;
  session.submit({ type: 'move-group', groupId: 'group-1', point: { x: 1480, y: 500 } });
  const adjusted = session.advance(S0_CLOCK.stepMs);
  const slots = adjusted.groups.find((g) => g.id === 'group-1')!.formation!.slots;
  expect(slots).not.toEqual(before!.slots);
  expect(slots.every((slot) => !pointBlocked(slot, adjusted.obstacles, UNIT_CLEARANCE))).toBe(true);
  const adjustedOrder = adjusted.groups.find((g) => g.id === 'group-1')!.formation;
  for (const point of [
    { x: -100, y: 0 },
    { x: NaN, y: 500 },
  ]) {
    session.submit({ type: 'move-group', groupId: 'group-1', point });
    const state = session.advance(S0_CLOCK.stepMs);
    expect(state.groups.find((g) => g.id === 'group-1')!.formation).toEqual(adjustedOrder);
    expect(state.selectedGroupId).toBe('group-1');
  }
  session.submit({ type: 'move-group', groupId: 'group-1000', point: { x: 500, y: 500 } });
  expect(
    session.advance(S0_CLOCK.stepMs).groups.find((g) => g.id === 'group-1')!.formation,
  ).toEqual(adjustedOrder);
});
