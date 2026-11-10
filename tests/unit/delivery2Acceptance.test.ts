import { DELIVERY2_LEVEL } from '../fixtures/delivery2Level';
import { expect, it } from 'vitest';
import { Session } from '../../src/app/session';
import { S0_CLOCK } from '../../src/core/config';
import type { CommandIntent, GameCommand, GroupId, Snapshot } from '../../src/core/types';
import { assertInvariants } from '../../src/simulation/invariants';
import { Simulation } from '../../src/simulation/simulation';

const blue = (state: Snapshot) => state.agents.filter((a) => a.alive && a.factionId === 'blue');
const red = (state: Snapshot) => state.agents.filter((a) => a.alive && a.factionId === 'red');
const orders = (groupId: GroupId, y: number): CommandIntent => ({
  type: 'set-formation',
  groupId,
  points: [
    { x: 1650, y },
    { x: 1750, y },
  ],
});

it('replays a complete victory with two routes, battle, reinforcement, merge losses and clean restart', () => {
  const session = new Session(DELIVERY2_LEVEL, S0_CLOCK);
  const initial = session.getSnapshot();
  const step = (...intents: CommandIntent[]) => {
    for (const intent of intents) session.submit(intent);
    return session.advance(S0_CLOCK.stepMs);
  };
  step({ type: 'select-group-id', groupId: 'group-1' }, { type: 'split', groupId: 'group-1' });
  step(orders('group-2', 300));
  step({ type: 'select-group-id', groupId: 'group-3' }, orders('group-3', 700));
  while (session.getSnapshot().tick < 600) step();
  const fronts = session.getSnapshot();
  assertInvariants(fronts);
  expect(fronts.groups.filter((group) => group.factionId === 'red')).toHaveLength(2);
  for (const [id, low, high] of [
    ['group-2', 200, 400],
    ['group-3', 600, 800],
  ] as const) {
    const agents = blue(fronts).filter((agent) => agent.groupId === id);
    expect(agents.length).toBeGreaterThan(0);
    expect(agents.every((agent) => agent.x > 1520 && agent.y > low && agent.y < high)).toBe(true);
  }
  expect(blue(fronts).length).toBeLessThan(40);
  expect(fronts.reinforcementCredits).toBeGreaterThanOrEqual(5);
  const split = step({ type: 'split', groupId: 'group-3' });
  const first = split.selectedGroupId!;
  const second = split.groups.find(
    (g) => g.factionId === 'blue' && g.id !== 'group-2' && g.id !== first,
  )!.id;
  expect(split.groups.filter((g) => g.factionId === 'blue')).toHaveLength(3);
  const beforeReinforce = split.agents.length;
  const reinforced = step({ type: 'reinforce', groupId: first });
  expect(reinforced.agents.length - beforeReinforce).toBe(2);
  expect(reinforced.reinforcementCredits).toBe(36 - red(reinforced).length - 5);
  assertInvariants(reinforced);
  let state = step({ type: 'merge', groupId: first, targetGroupId: second });
  while (state.merge) state = step();
  state = step({ type: 'merge', groupId: first, targetGroupId: 'group-2' });
  let deathsDuringMerge = 0;
  for (let i = 0; i < 400 && state.merge; i++) {
    const previous = state;
    state = step();
    deathsDuringMerge += blue(previous).length - blue(state).length;
    assertInvariants(state);
  }
  expect(state.merge).toBeNull();
  expect(state.groups.filter((group) => group.factionId === 'blue')).toHaveLength(1);
  expect(deathsDuringMerge).toBeGreaterThan(0);
  for (const y of [100, 300, 500, 700, 900]) {
    if (state.result) break;
    const groupId = state.groups.find((g) => g.factionId === 'blue')!.id;
    state = step(
      { type: 'select-group-id', groupId },
      {
        type: 'set-formation',
        groupId,
        points: [
          { x: 1550, y },
          { x: 3150, y },
        ],
      },
    );
    for (let i = 0; i < 650 && state.result === null; i++) state = step();
    assertInvariants(state);
  }
  expect(state.result).toBe('victory');
  expect(
    state.paintCells.filter((cell) => cell.owner === 'blue').length /
      state.paintCells.filter((cell) => !cell.blocked).length,
  ).toBeGreaterThanOrEqual(DELIVERY2_LEVEL.victoryFraction);
  expect(red(state).length).toBeGreaterThan(0);
  const victory = state;
  const log = session.commandLog;
  const replay = new Simulation(DELIVERY2_LEVEL);
  const byTick = new Map<number, GameCommand[]>();
  for (const command of log)
    byTick.set(command.tick, [...(byTick.get(command.tick) ?? []), command]);
  for (let tick = 0; tick < victory.tick; tick++) replay.step(byTick.get(tick) ?? []);
  expect(replay.getSnapshot()).toEqual(victory);
  step({ type: 'split', groupId: victory.selectedGroupId! });
  expect(session.getSnapshot()).toEqual(victory);
  session.submit('restart');
  expect(session.advance(0)).toEqual(initial);
  expect(session.commandLog).toEqual([]);
});

it('handles an actual combat death on the same tick as a player split', () => {
  const setup = () => {
    const sim = new Simulation(DELIVERY2_LEVEL);
    sim.step([
      { tick: 0, type: 'select-group-id', groupId: 'group-1' },
      { tick: 0, type: 'split', groupId: 'group-1' },
    ]);
    sim.step([{ tick: 1, ...orders('group-2', 300) } as GameCommand]);
    sim.step([
      { tick: 2, type: 'select-group-id', groupId: 'group-3' },
      { tick: 2, ...orders('group-3', 700) } as GameCommand,
    ]);
    return sim;
  };
  const baseline = setup();
  let tick = -1;
  let groupId: GroupId | null = null;
  for (let i = 0; i < 1000; i++) {
    const before = baseline.getSnapshot();
    baseline.step();
    const after = baseline.getSnapshot();
    const casualty = blue(before).find(
      (agent) => !after.agents.find((item) => item.id === agent.id)!.alive,
    );
    if (casualty) {
      tick = before.tick;
      groupId = casualty.groupId;
      break;
    }
  }
  expect(tick).toBeGreaterThan(0);
  expect(groupId).not.toBeNull();
  const simultaneous = setup();
  while (simultaneous.tick < tick) simultaneous.step();
  const before = simultaneous.getSnapshot();
  simultaneous.step([
    { tick, type: 'select-group-id', groupId },
    { tick, type: 'split', groupId: groupId! },
  ]);
  const after = simultaneous.getSnapshot();
  expect(blue(after).length).toBeLessThan(blue(before).length);
  expect(after.groups.filter((group) => group.factionId === 'blue')).toHaveLength(3);
  assertInvariants(after);
});

it(
  'reaches defeat on the real map when isolated blue agents attack one at a time',
  { timeout: 30000 },
  () => {
    const sim = new Simulation(DELIVERY2_LEVEL);
    const log: GameCommand[] = [];
    const issue = (...commands: CommandIntent[]) => {
      const ticked = commands.map((command) => ({ ...command, tick: sim.tick }) as GameCommand);
      log.push(...ticked);
      sim.step(ticked);
    };
    while (true) {
      const group = sim
        .getSnapshot()
        .groups.find((g) => g.factionId === 'blue' && g.agentIds.length > 1);
      if (!group) break;
      issue({ type: 'select-group-id', groupId: group.id }, { type: 'split', groupId: group.id });
    }
    for (let attempt = 0; attempt < 45 && sim.getSnapshot().result === null; attempt++) {
      const group = sim.getSnapshot().groups.find((g) => g.factionId === 'blue');
      if (!group) break;
      issue(
        { type: 'select-group-id', groupId: group.id },
        {
          type: 'set-formation',
          groupId: group.id,
          points: [
            { x: 1800, y: 480 },
            { x: 1840, y: 520 },
          ],
        },
      );
      for (let tick = 0; tick < 1300; tick++) {
        sim.step();
        if (tick % 20 === 0) {
          const state = sim.getSnapshot();
          if (state.result || !state.groups.some((item) => item.id === group.id)) break;
        }
      }
    }
    const defeat = sim.getSnapshot();
    expect(defeat.result).toBe('defeat');
    expect(blue(defeat)).toHaveLength(0);
    expect(red(defeat).length).toBeGreaterThan(0);
    assertInvariants(defeat);
    const byTick = new Map<number, GameCommand[]>();
    for (const command of log)
      byTick.set(command.tick, [...(byTick.get(command.tick) ?? []), command]);
    const replay = new Simulation(DELIVERY2_LEVEL);
    for (let tick = 0; tick < defeat.tick; tick++) replay.step(byTick.get(tick) ?? []);
    expect(replay.getSnapshot()).toEqual(defeat);
    sim.step([{ tick: sim.tick, type: 'select-group-id', groupId: null }]);
    expect(sim.getSnapshot()).toEqual(defeat);
  },
);

it('shows a coverage-versus-concentration tradeoff on the current map in controlled scenarios', () => {
  const coverage = (split: boolean) => {
    const sim = new Simulation(DELIVERY2_LEVEL);
    sim.step([{ tick: 0, type: 'select-group-id', groupId: 'group-1' }]);
    if (split) {
      sim.step([{ tick: 1, type: 'split', groupId: 'group-1' }]);
      sim.step([
        {
          tick: 2,
          type: 'set-formation',
          groupId: 'group-2',
          points: [
            { x: 200, y: 180 },
            { x: 980, y: 180 },
          ],
        },
      ]);
      sim.step([
        { tick: 3, type: 'select-group-id', groupId: 'group-3' },
        {
          tick: 3,
          type: 'set-formation',
          groupId: 'group-3',
          points: [
            { x: 200, y: 820 },
            { x: 980, y: 820 },
          ],
        },
      ]);
    } else {
      sim.step([
        {
          tick: 1,
          type: 'set-formation',
          groupId: 'group-1',
          points: [
            { x: 200, y: 180 },
            { x: 980, y: 180 },
          ],
        },
      ]);
    }
    while (sim.tick < 480) sim.step();
    return sim.getSnapshot().paintCells.filter((cell) => cell.owner === 'blue').length;
  };
  const fight = (split: boolean) => {
    const sim = new Simulation(DELIVERY2_LEVEL);
    sim.step([
      { tick: 0, type: 'select-group-id', groupId: 'group-1' },
      ...(split ? [{ tick: 0, type: 'split' as const, groupId: 'group-1' as const }] : []),
    ]);
    const groupId: GroupId = split ? 'group-2' : 'group-1';
    sim.step([{ tick: 1, ...orders(groupId, 300) } as GameCommand]);
    while (sim.tick < 1200 && sim.getSnapshot().result === null) sim.step();
    return red(sim.getSnapshot()).length;
  };
  expect(coverage(true)).toBeGreaterThan(coverage(false));
  expect(fight(false)).toBeLessThan(fight(true));
});
