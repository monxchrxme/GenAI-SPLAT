import { expect, it } from 'vitest';
import { IZLUCHINA } from '../../src/levels/izluchina';
import { createInitialState } from '../../src/simulation/initialState';
import { objectiveCells, updateObjective } from '../../src/simulation/objective';
import {
  findRoute,
  pointBlocked,
  segmentClear,
  UNIT_CLEARANCE,
} from '../../src/simulation/obstacles';
import { Simulation } from '../../src/simulation/simulation';
import { enemyCommands } from '../../src/enemy/controller';

it('leaves two routes around the first pond and keeps capture areas and mine candidates on open ground', () => {
  const state = new Simulation(IZLUCHINA).getSnapshot();
  for (const y of [200, 660]) {
    expect(segmentClear({ x: 680, y }, { x: 1550, y }, state.obstacles, UNIT_CLEARANCE)).toBe(true);
  }
  for (const target of [...state.checkpoints, state.objective!]) {
    const { area } = target;
    const center = { x: area.x + area.width / 2, y: area.y + area.height / 2 };
    expect(findRoute({ x: 430, y: 500 }, center, state.world, state.obstacles)).not.toBeNull();
    for (const mine of IZLUCHINA.hazards!.mines) {
      expect(pointBlocked(mine, state.obstacles)).toBe(false);
      expect(pointBlocked(mine, [area], IZLUCHINA.hazards!.mineRadius)).toBe(false);
    }
  }
});

it('records checkpoints in map order and keeps the first when it is repainted', () => {
  const state = createInitialState(IZLUCHINA);
  const first = objectiveCells(state, state.checkpoints[0]!.area);
  const second = objectiveCells(state, state.checkpoints[1]!.area);
  for (const cell of second) cell.owner = 'blue';
  updateObjective(state);
  expect(state.checkpoints.map((point) => point.captured)).toEqual([false, false]);

  for (const cell of first) cell.owner = 'blue';
  updateObjective(state);
  expect(state.checkpoints.map((point) => point.captured)).toEqual([true, false]);

  for (const cell of first) cell.owner = 'red';
  updateObjective(state);
  expect(state.checkpoints.map((point) => point.captured)).toEqual([true, true]);
});

it('keeps two visible supports behind each checkpoint and lets a flank group draw one away', () => {
  const state = new Simulation(IZLUCHINA).getSnapshot();
  for (const { area, viewEnd } of state.checkpoints) {
    const supports = IZLUCHINA.enemyPosts!.map((post, index) => ({ post, index })).filter(
      ({ post }) => post.centerX > area.x + area.width && post.centerX < viewEnd!,
    );
    expect(supports).toHaveLength(2);
    const { post: flank, index: flankIndex } = supports[0]!;
    const { index: otherIndex } = supports[1]!;
    const approach = { x: area.x + area.width / 2, y: area.y + area.height / 2 };
    const withBlue = (bait: boolean) => ({
      ...state,
      agents: state.agents.map((agent, index) =>
        agent.factionId === 'red'
          ? agent
          : {
              ...agent,
              ...(bait && index === 0 ? { x: flank.centerX - 60, y: flank.centerY } : approach),
            },
      ),
    });
    const orderY = (post: number, bait: boolean) => {
      const group = state.groups.find((group) => group.enemyPost === post)!;
      const order = enemyCommands(withBlue(bait), IZLUCHINA).find(
        (command) => command.type === 'enemy-formation' && command.groupId === group.id,
      );
      if (order?.type !== 'enemy-formation') throw new Error('Missing support formation');
      return order.points.reduce((sum, point) => sum + point.y, 0) / order.points.length;
    };
    const firstWithoutBait = orderY(flankIndex, false);
    expect(Math.abs(firstWithoutBait - approach.y)).toBeLessThan(30);
    expect(orderY(flankIndex, true)).toBeCloseTo(flank.centerY);
    expect(orderY(otherIndex, true)).toBeCloseTo(orderY(otherIndex, false));
  }
});
