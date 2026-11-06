import { expect, it } from 'vitest';
import { Session } from '../../src/app/session';
import { S0_CLOCK, S0_LEVEL } from '../../src/core/config';
import { assertInvariants } from '../../src/simulation/invariants';

const points = [
  { x: 600, y: 200 },
  { x: 1100, y: 700 },
];
it('selection by captured ID and an immediate formation share a fixed tick in order', () => {
  const session = new Session(S0_LEVEL, S0_CLOCK);
  session.submit({ type: 'select-group-id', groupId: 'group-1' });
  session.submit({ type: 'set-formation', groupId: 'group-1', points });
  expect(session.advance(0).selectedGroupId).toBeNull();
  const state = session.advance(S0_CLOCK.stepMs);
  expect(state.selectedGroupId).toBe('group-1');
  expect(state.groups[0]?.formation?.points).toEqual(points);
  expect(state.groups[0]?.formation?.slots).toHaveLength(40);
  assertInvariants(state);
});
it('clear, immediate reselection and repeated replacement orders cannot leave a stale target', () => {
  const session = new Session(S0_LEVEL, S0_CLOCK);
  session.submit({ type: 'select-group-id', groupId: 'group-1' });
  session.submit({ type: 'set-formation', groupId: 'group-1', points });
  session.advance(S0_CLOCK.stepMs);
  session.submit({ type: 'select-group-id', groupId: null });
  session.submit({ type: 'select-group-id', groupId: 'group-1' });
  for (let i = 0; i < 20; i++)
    session.submit({
      type: 'set-formation',
      groupId: 'group-1',
      points: [...points, { x: 1200, y: 500 + i }],
    });
  const state = session.advance(S0_CLOCK.stepMs);
  expect(state.selectedGroupId).toBe('group-1');
  expect(state.groups[0]?.formation?.points.at(-1)).toEqual({ x: 1200, y: 519 });
  assertInvariants(state);
});
it('invalid captured IDs are ignored and null clears the plan and velocities', () => {
  const session = new Session(S0_LEVEL, S0_CLOCK);
  session.submit({ type: 'select-group-id', groupId: 'group-1' });
  session.submit({ type: 'set-formation', groupId: 'group-1', points });
  session.advance(S0_CLOCK.stepMs);
  session.submit({ type: 'select-group-id', groupId: 'group-999' });
  expect(session.advance(S0_CLOCK.stepMs).selectedGroupId).toBe('group-1');
  session.submit({ type: 'select-group-id', groupId: null });
  const state = session.advance(S0_CLOCK.stepMs);
  expect(state.selectedGroupId).toBeNull();
  expect(state.groups[0]?.formation).toBeUndefined();
  expect(state.agents.every((a) => a.vx === 0 && a.vy === 0)).toBe(true);
  assertInvariants(state);
});
