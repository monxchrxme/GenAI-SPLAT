import { expect, it } from 'vitest';
import { Session } from '../../src/app/session';
import { S0_CLOCK, S0_LEVEL } from '../../src/core/config';
import { assertInvariants } from '../../src/simulation/invariants';

type Point = { x: number; y: number };
const horizontal = (y: number): Point[] => [
  { x: 200, y },
  { x: 980, y },
];
const cut = [
  { x: 590, y: 200 },
  { x: 590, y: 400 },
];

it('two squads follow different orders, repeated merge is safe and Restart clears the in-flight operation', () => {
  const session = new Session(S0_LEVEL, S0_CLOCK);
  const initial = session.getSnapshot();
  session.submit({ type: 'select-group-id', groupId: 'group-1' });
  session.submit({ type: 'set-formation', groupId: 'group-1', points: horizontal(300) });
  session.advance(S0_CLOCK.stepMs);
  session.submit({ type: 'cut', groupId: 'group-1', points: cut });
  session.submit({ type: 'cut', groupId: 'group-1', points: cut });
  let state = session.advance(S0_CLOCK.stepMs);
  expect(state.groups.map((group) => group.agentIds.length)).toEqual([20, 20]);
  session.submit({ type: 'set-formation', groupId: 'group-2', points: horizontal(180) });
  session.submit({ type: 'select-group-id', groupId: 'group-3' });
  session.submit({ type: 'set-formation', groupId: 'group-3', points: horizontal(820) });
  for (let i = 0; i < 900; i++) state = session.advance(S0_CLOCK.stepMs);
  assertInvariants(state);
  expect(
    state.agents.filter((a) => a.groupId === 'group-2').every((a) => Math.abs(a.y - 180) < 1),
  ).toBe(true);
  expect(
    state.agents.filter((a) => a.groupId === 'group-3').every((a) => Math.abs(a.y - 820) < 1),
  ).toBe(true);
  expect(state.groups).toHaveLength(2);
  session.submit({ type: 'merge', groupId: 'group-3', targetGroupId: 'group-2' });
  session.submit({ type: 'merge', groupId: 'group-3', targetGroupId: 'group-2' });
  state = session.advance(S0_CLOCK.stepMs);
  expect(state.merge).not.toBeNull();
  expect(state.groups).toHaveLength(2);
  session.submit('restart');
  expect(session.advance(S0_CLOCK.stepMs)).toEqual(initial);
  expect(session.commandLog).toEqual([]);
});
