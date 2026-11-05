import { describe, expect, it } from 'vitest';
import { Session } from '../../src/app/session';
import { S0_CLOCK, S0_LEVEL } from '../../src/core/config';
import { FixedStepClock } from '../../src/core/fixedStepClock';
import { SeededRng } from '../../src/core/rng';
import type { MatchState } from '../../src/core/types';
import { createInitialState } from '../../src/simulation/initialState';
import { assertInvariants } from '../../src/simulation/invariants';
import { Simulation } from '../../src/simulation/simulation';

describe('seeded foundation', () => {
  it('creates exactly 40 unique, live blue agents in one complete group', () => {
    const state = createInitialState(S0_LEVEL);
    expect(state.agents).toHaveLength(40);
    expect(new Set(state.agents.map((agent) => agent.id)).size).toBe(40);
    expect(state.groups).toHaveLength(1);
    expect(state.groups[0]?.agentIds).toEqual(state.agents.map((agent) => agent.id));
    expect(state.agents.every((agent) => agent.alive && agent.factionId === 'blue')).toBe(true);
    expect(() => assertInvariants(state)).not.toThrow();
  });

  it('uses the seed for a stable spawn and creates fresh objects on each start', () => {
    const first = createInitialState(S0_LEVEL);
    const second = createInitialState(S0_LEVEL);
    expect(second).toEqual(first);
    expect(second.agents).not.toBe(first.agents);
    expect(second.groups[0]?.agentIds).not.toBe(first.groups[0]?.agentIds);
    expect(second.world).not.toBe(first.world);
    expect(createInitialState({ ...S0_LEVEL, seed: 7 }).agents).not.toEqual(first.agents);
  });

  it('RNG is repeatable, bounded, supports seed zero and explicit state', () => {
    const a = new SeededRng(0);
    const b = new SeededRng(0);
    const sequence = Array.from({ length: 1000 }, () => a.next());
    expect(sequence).toEqual(Array.from({ length: 1000 }, () => b.next()));
    expect(sequence.every((value) => value >= 0 && value < 1)).toBe(true);
    const resumed = new SeededRng(a.state);
    expect(resumed.next()).toBe(a.next());
    expect(new SeededRng(1).next()).toBe(0.6270739405881613);
    expect(() => new SeededRng(-1)).toThrow();
  });

  it('publishes deeply frozen detached snapshots without render access to state', () => {
    const simulation = new Simulation(S0_LEVEL);
    const snapshot = simulation.getSnapshot();
    expect(Reflect.set(snapshot, 'tick', 99)).toBe(false);
    expect(Reflect.set(snapshot.agents[0]!, 'x', 0)).toBe(false);
    expect(Reflect.set(snapshot.groups[0]!.agentIds, '0', 'agent-999')).toBe(false);
    expect(Reflect.set(snapshot.world, 'width', 1)).toBe(false);
    simulation.step();
    expect(snapshot.tick).toBe(0);
    expect(simulation.getSnapshot().tick).toBe(1);
    expect(simulation.getSnapshot().agents).toEqual(snapshot.agents);
  });

  it.each([
    [
      'duplicate agent ID',
      (s: MatchState) => {
        s.agents[1]!.id = s.agents[0]!.id;
      },
    ],
    [
      'duplicate group ID',
      (s: MatchState) => {
        s.groups.push({ ...s.groups[0]! });
      },
    ],
    [
      'duplicate member',
      (s: MatchState) => {
        s.groups[0]!.agentIds.push(s.agents[0]!.id);
      },
    ],
    [
      'missing membership',
      (s: MatchState) => {
        s.groups[0]!.agentIds.pop();
      },
    ],
    [
      'orphan group',
      (s: MatchState) => {
        s.agents[0]!.groupId = 'group-99';
      },
    ],
    [
      'wrong faction',
      (s: MatchState) => {
        s.agents[0]!.factionId = 'red';
      },
    ],
    [
      'unknown member',
      (s: MatchState) => {
        s.groups[0]!.agentIds[0] = 'agent-999';
      },
    ],
    [
      'dead member',
      (s: MatchState) => {
        s.agents[0]!.alive = false;
      },
    ],
    [
      'empty group',
      (s: MatchState) => {
        s.groups[0]!.agentIds = [];
      },
    ],
    [
      'invalid position',
      (s: MatchState) => {
        s.agents[0]!.x = Number.NaN;
      },
    ],
  ] as const)('rejects %s', (_, corrupt) => {
    const state = createInitialState(S0_LEVEL);
    corrupt(state);
    expect(() => assertInvariants(state)).toThrow();
  });
});

describe('fixed steps and restart', () => {
  it('produces the same 120 ticks and logical state at 30, 60 and 144 render FPS', () => {
    const results = [30, 60, 144].map((fps) => {
      const session = new Session(S0_LEVEL, S0_CLOCK);
      for (let frame = 0; frame < fps * 2; frame++) session.advance(1000 / fps);
      expect(session.getSnapshot().tick).toBe(120);
      assertInvariants(session.getSnapshot());
      return session.getSnapshot();
    });
    expect(results[0]).toEqual(results[1]);
    expect(results[1]).toEqual(results[2]);
  });

  it('caps catch-up work after stalls and discards whole overdue steps', () => {
    const session = new Session(S0_LEVEL, S0_CLOCK);
    expect(session.advance(60_000).tick).toBe(S0_CLOCK.maxStepsPerFrame);
    expect(session.advance(0).tick).toBe(S0_CLOCK.maxStepsPerFrame);
    expect(session.advance(S0_CLOCK.stepMs).tick).toBe(S0_CLOCK.maxStepsPerFrame + 1);
  });

  it('restart replaces the complete logical state and clears queue, log and fractional time', () => {
    const session = new Session(S0_LEVEL, S0_CLOCK);
    const initial = session.getSnapshot();
    session.advance(S0_CLOCK.stepMs * 2.5);
    session.submit('restart');
    session.submit('restart');
    expect(session.commandLog).toEqual([
      { type: 'restart', tick: 2 },
      { type: 'restart', tick: 2 },
    ]);
    expect(Object.isFrozen(session.commandLog)).toBe(true);
    expect(session.advance(1000)).toEqual(initial);
    expect(session.commandLog).toEqual([]);
    expect(session.advance(S0_CLOCK.stepMs / 2).tick).toBe(0);
    expect(session.advance(S0_CLOCK.stepMs / 2).tick).toBe(1);
    for (let i = 0; i < 10; i++) {
      session.submit('restart');
      expect(session.advance(0)).toEqual(initial);
      assertInvariants(session.getSnapshot());
    }
    expect(session.restartCount).toBe(11);
  });

  it('ignores hidden-tab elapsed time when the browser adapter resets its timing', () => {
    const session = new Session(S0_LEVEL, S0_CLOCK);
    session.advance(S0_CLOCK.stepMs / 2);
    session.discardFrameTime();
    expect(session.advance(S0_CLOCK.stepMs / 2).tick).toBe(0);
  });

  it('rejects invalid timing and mismatched clock configuration', () => {
    const clock = new FixedStepClock(S0_CLOCK);
    for (const value of [-1, NaN, Infinity]) expect(() => clock.advance(value, () => {})).toThrow();
    expect(() => new FixedStepClock({ ...S0_CLOCK, stepMs: 0 })).toThrow();
    expect(() => new Session(S0_LEVEL, { ...S0_CLOCK, stepMs: 10 })).toThrow();
  });
});
