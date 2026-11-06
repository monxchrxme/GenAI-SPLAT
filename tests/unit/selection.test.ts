import { describe, expect, it } from 'vitest';
import { Session } from '../../src/app/session';
import { S0_CLOCK, S0_LEVEL } from '../../src/core/config';
import { FixedStepClock } from '../../src/core/fixedStepClock';
import { createFormation } from '../../src/core/formation';
import type { GameCommand } from '../../src/core/types';
import { createInitialState } from '../../src/simulation/initialState';
import { assertInvariants } from '../../src/simulation/invariants';
import { pickGroupAtPoint } from '../../src/simulation/selection';
import { Simulation } from '../../src/simulation/simulation';

const first = createInitialState(S0_LEVEL).agents[0]!;
const point = { x: first.x, y: first.y };

describe('selection commands and clean session', () => {
  it('applies selection at the next fixed tick and freezes a detached command payload', () => {
    const session = new Session(S0_LEVEL, S0_CLOCK);
    const initial = session.getSnapshot();
    const mutablePoint = { ...point };
    session.submit({ type: 'select-group', point: mutablePoint });
    mutablePoint.x = 0;
    expect(session.commandLog).toEqual([{ type: 'select-group', tick: 0, point }]);
    expect(
      session.commandLog[0]?.type === 'select-group' &&
        Object.isFrozen(session.commandLog[0].point),
    ).toBe(true);
    expect(session.advance(0)).toEqual(initial);
    expect(session.advance(S0_CLOCK.stepMs / 2).selectedGroupId).toBeNull();
    const selected = session.advance(S0_CLOCK.stepMs / 2);
    expect(selected.selectedGroupId).toBe('group-1');
    expect(initial.selectedGroupId).toBeNull();
    expect(Reflect.set(selected, 'selectedGroupId', null)).toBe(false);
    expect(selected.agents).toEqual(initial.agents);
    expect(selected.groups).toEqual(initial.groups);
    assertInvariants(selected);
  });

  it('selects the whole group, deselects on empty ground, and handles rapid commands in order', () => {
    const session = new Session(S0_LEVEL, S0_CLOCK);
    const initial = session.getSnapshot();
    for (let index = 0; index < 50; index++) {
      session.submit({
        type: 'select-group',
        point: index % 2 === 0 ? point : { x: 1400, y: 900 },
      });
    }
    expect(session.advance(S0_CLOCK.stepMs).selectedGroupId).toBeNull();
    session.submit({ type: 'select-group', point });
    const selected = session.advance(S0_CLOCK.stepMs);
    expect(selected.selectedGroupId).toBe('group-1');
    expect(selected.groups[0]?.agentIds).toHaveLength(40);
    expect(selected.agents).toEqual(initial.agents);
    assertInvariants(selected);
  });

  it('ignores non-finite, off-world and wrong-tick commands without losing selection', () => {
    const simulation = new Simulation(S0_LEVEL);
    simulation.step([{ type: 'select-group', tick: 0, point }]);
    for (const invalid of [
      { x: NaN, y: 0 },
      { x: Infinity, y: 0 },
      { x: -1, y: 0 },
      { x: 1601, y: 0 },
      { x: 0, y: 1001 },
      { x: 0, y: -1 },
    ]) {
      simulation.step([{ type: 'select-group', tick: simulation.tick, point: invalid }]);
      expect(simulation.getSnapshot().selectedGroupId).toBe('group-1');
    }
    simulation.step([{ type: 'select-group', tick: 999, point: { x: 1400, y: 900 } }]);
    expect(simulation.getSnapshot().selectedGroupId).toBe('group-1');
  });

  it('restart clears selection, pending commands, history and fractional time', () => {
    const session = new Session(S0_LEVEL, S0_CLOCK);
    const initial = session.getSnapshot();
    session.submit({ type: 'select-group', point });
    expect(session.advance(S0_CLOCK.stepMs * 1.5).selectedGroupId).toBe('group-1');
    session.submit({ type: 'select-group', point });
    session.submit('restart');
    session.submit({ type: 'select-group', point });
    expect(session.advance(100)).toEqual(initial);
    expect(session.commandLog).toEqual([]);
    expect(session.advance(S0_CLOCK.stepMs / 2)).toEqual(initial);
    expect(session.restartCount).toBe(1);
  });

  it('replays the same selection command log at 30/60/144 render FPS', () => {
    const commands: GameCommand[] = [
      { type: 'select-group', tick: 0, point },
      { type: 'select-group', tick: 5, point: { x: 1400, y: 900 } },
      { type: 'select-group', tick: 20, point },
    ];
    const results = [30, 60, 144].map((fps) => {
      const simulation = new Simulation(S0_LEVEL);
      const clock = new FixedStepClock(S0_CLOCK);
      for (let frame = 0; frame < fps * 2; frame++) {
        clock.advance(1000 / fps, () => {
          simulation.step(commands.filter((command) => command.tick === simulation.tick));
        });
      }
      expect(simulation.tick).toBe(120);
      const snapshot = simulation.getSnapshot();
      expect(snapshot.selectedGroupId).toBe('group-1');
      assertInvariants(snapshot);
      return snapshot;
    });
    expect(results[0]).toEqual(results[1]);
    expect(results[1]).toEqual(results[2]);
  });
});

it('picks the nearest live blue agent with a stable ID tie-break; other groups are fixtures only', () => {
  const state = createInitialState(S0_LEVEL);
  state.agents[0]!.x = 100;
  state.agents[0]!.y = 100;
  const other = {
    ...state.agents[0]!,
    id: 'agent-99' as const,
    groupId: 'group-2' as const,
    x: 104,
  };
  const red = {
    ...other,
    id: 'agent-100' as const,
    groupId: 'group-3' as const,
    factionId: 'red' as const,
    x: 102,
  };
  state.agents.push(other, red);
  state.groups.push(
    { id: 'group-2', factionId: 'blue', agentIds: [other.id] },
    { id: 'group-3', factionId: 'red', agentIds: [red.id] },
  );
  assertInvariants(state);
  expect(pickGroupAtPoint(state, { x: 102, y: 100 }, S0_LEVEL.selection)).toBe('group-1');
  state.agents.reverse();
  expect(pickGroupAtPoint(state, { x: 102, y: 100 }, S0_LEVEL.selection)).toBe('group-1');
  expect(pickGroupAtPoint(state, { x: 104, y: 100 }, S0_LEVEL.selection)).toBe('group-2');
  other.alive = false;
  expect(pickGroupAtPoint(state, { x: 104, y: 100 }, S0_LEVEL.selection)).toBe('group-1');
});

it('rejects an invalid selected group reference and invalid configured selection radius', () => {
  const state = createInitialState(S0_LEVEL);
  state.selectedGroupId = 'group-999';
  expect(() => assertInvariants(state)).toThrow('Selected group');
  for (const hitRadius of [0, -1, NaN, Infinity]) {
    expect(
      () => new Simulation({ ...S0_LEVEL, selection: { ...S0_LEVEL.selection, hitRadius } }),
    ).toThrow('selection radius');
  }
  for (const neighborDistance of [0, -1, NaN, Infinity]) {
    expect(
      () => new Simulation({ ...S0_LEVEL, selection: { ...S0_LEVEL.selection, neighborDistance } }),
    ).toThrow('neighbor distance');
  }
});

function fixture(points: readonly { x: number; y: number }[]) {
  const state = createInitialState(S0_LEVEL),
    template = state.agents[0]!;
  state.agents = points.map((p, i) => ({ ...template, ...p, id: `agent-${i + 1}` }));
  state.groups[0]!.agentIds = state.agents.map((a) => a.id);
  return state;
}

it('selects the empty centre of a dense cluster beyond every individual hit radius', () => {
  const state = createInitialState(S0_LEVEL);
  const corners = [0, 1, 8, 9].map((i) => state.agents[i]!);
  const p = {
    x: corners.reduce((s, a) => s + a.x, 0) / 4,
    y: corners.reduce((s, a) => s + a.y, 0) / 4,
  };
  expect(
    state.agents.every((a) => Math.hypot(a.x - p.x, a.y - p.y) > S0_LEVEL.selection.hitRadius),
  ).toBe(true);
  expect(pickGroupAtPoint(state, p, S0_LEVEL.selection)).toBe('group-1');
  const sim = new Simulation(S0_LEVEL);
  sim.step([{ type: 'select-group', tick: 0, point: p }]);
  expect(sim.getSnapshot().selectedGroupId).toBe('group-1');
  expect(sim.getSnapshot().agents).toEqual(state.agents);
});

it('bridges only nearby agents with a bounded width, including the exact neighbor threshold', () => {
  const state = fixture([
    { x: 100, y: 100 },
    { x: 160, y: 100 },
  ]);
  expect(pickGroupAtPoint(state, { x: 130, y: 116 }, S0_LEVEL.selection)).toBe('group-1');
  expect(pickGroupAtPoint(state, { x: 130, y: 116.01 }, S0_LEVEL.selection)).toBeNull();
  state.agents[1]!.x = 160.01;
  expect(pickGroupAtPoint(state, { x: 130, y: 100 }, S0_LEVEL.selection)).toBeNull();
});

it('does not select large holes, distant formation targets or spaces across different groups', () => {
  const state = fixture([
    { x: 100, y: 100 },
    { x: 300, y: 100 },
    { x: 100, y: 300 },
  ]);
  state.groups[0]!.formation = createFormation(
    [
      { x: 150, y: 150 },
      { x: 150, y: 200 },
    ],
    state.groups[0]!.agentIds,
  )!;
  expect(pickGroupAtPoint(state, { x: 150, y: 150 }, S0_LEVEL.selection)).toBeNull();
  state.agents[1]!.x = 150;
  state.agents[1]!.groupId = 'group-2';
  state.groups.push({ id: 'group-2', factionId: 'blue', agentIds: ['agent-2'] });
  state.groups[0]!.agentIds = ['agent-1', 'agent-3'];
  expect(pickGroupAtPoint(state, { x: 125, y: 100 }, S0_LEVEL.selection)).toBeNull();
});

it('excludes dead/enemy agents from gaps and gives direct agent hits priority', () => {
  const state = fixture([
    { x: 100, y: 100 },
    { x: 150, y: 100 },
  ]);
  state.agents[1]!.alive = false;
  expect(pickGroupAtPoint(state, { x: 125, y: 100 }, S0_LEVEL.selection)).toBeNull();
  state.agents[1]!.alive = true;
  state.agents[1]!.factionId = 'red';
  expect(pickGroupAtPoint(state, { x: 125, y: 100 }, S0_LEVEL.selection)).toBeNull();
  state.agents[1]!.factionId = 'blue';
  state.agents.push({ ...state.agents[0]!, id: 'agent-99', groupId: 'group-2', x: 125, y: 112 });
  state.groups.push({ id: 'group-2', factionId: 'blue', agentIds: ['agent-99'] });
  expect(pickGroupAtPoint(state, { x: 125, y: 112 }, S0_LEVEL.selection)).toBe('group-2');
});

it('chooses overlapping gaps deterministically independent of agent and group order', () => {
  const state = fixture([
    { x: 100, y: 100 },
    { x: 150, y: 100 },
  ]);
  state.agents.push(
    { ...state.agents[0]!, id: 'agent-98', groupId: 'group-2', x: 125, y: 75 },
    { ...state.agents[1]!, id: 'agent-99', groupId: 'group-2', x: 125, y: 125 },
  );
  state.groups.push({ id: 'group-2', factionId: 'blue', agentIds: ['agent-98', 'agent-99'] });
  const before = structuredClone(state);
  expect(pickGroupAtPoint(state, { x: 125, y: 100 }, S0_LEVEL.selection)).toBe('group-1');
  expect(state).toEqual(before);
  state.agents.reverse();
  state.groups.reverse();
  expect(pickGroupAtPoint(state, { x: 125, y: 100 }, S0_LEVEL.selection)).toBe('group-1');
});
