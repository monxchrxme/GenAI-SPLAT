import { DELIVERY2_LEVEL } from '../fixtures/delivery2Level';
import { expect, it } from 'vitest';
import { S0_LEVEL } from '../../src/core/config';
import { Simulation } from '../../src/simulation/simulation';
import {
  findRoute,
  pointBlocked,
  segmentClear,
  UNIT_CLEARANCE,
} from '../../src/simulation/obstacles';
import { createInitialState } from '../../src/simulation/initialState';

it('routes through one of two openings and never crosses the expanded obstacle', () => {
  const start = { x: 1300, y: 500 },
    target = { x: 1700, y: 500 };
  const obstacles = DELIVERY2_LEVEL.obstacles!;
  expect(segmentClear(start, target, obstacles, UNIT_CLEARANCE)).toBe(false);
  for (const y of [300, 700])
    expect(segmentClear({ x: 1300, y }, { x: 1700, y }, obstacles, UNIT_CLEARANCE)).toBe(true);
  const route = findRoute(start, target, DELIVERY2_LEVEL.world, obstacles)!;
  expect(route.length).toBeGreaterThan(1);
  let previous = start;
  for (const point of route) {
    expect(segmentClear(previous, point, obstacles, UNIT_CLEARANCE)).toBe(true);
    previous = point;
  }
  expect(route.at(-1)).toEqual(target);
});

it('moves an agent around obstacles without crossing them and rejects targets inside', () => {
  const config = {
    ...S0_LEVEL,
    world: DELIVERY2_LEVEL.world,
    obstacles: DELIVERY2_LEVEL.obstacles!,
    victoryFraction: 1,
    spawn: { ...S0_LEVEL.spawn, count: 1, columns: 1, centerX: 1300, centerY: 500, jitter: 0 },
  };
  const sim = new Simulation(config);
  sim.step([{ tick: 0, type: 'select-group-id', groupId: 'group-1' }]);
  sim.step([
    {
      tick: 1,
      type: 'set-formation',
      groupId: 'group-1',
      points: [
        { x: 1460, y: 450 },
        { x: 1500, y: 450 },
      ],
    },
  ]);
  expect(sim.getSnapshot().groups[0]!.formation).toBeUndefined();
  sim.step([
    {
      tick: 2,
      type: 'set-formation',
      groupId: 'group-1',
      points: [
        { x: 1680, y: 500 },
        { x: 1720, y: 500 },
      ],
    },
  ]);
  for (let i = 0; i < 500; i++) {
    sim.step();
    expect(pointBlocked(sim.getSnapshot().agents[0]!, config.obstacles!, UNIT_CLEARANCE)).toBe(
      false,
    );
  }
  expect(sim.getSnapshot().agents[0]!.x).toBeCloseTo(1700, 0);
});

it('excludes obstacle cells from paint and leaves less than the win threshold on the starting side', () => {
  const state = createInitialState(DELIVERY2_LEVEL);
  const blocked = state.paintCells.filter((cell) => cell.blocked);
  expect(blocked).toHaveLength(6);
  expect(blocked.every((cell) => cell.owner === null && cell.control === 0)).toBe(true);
  const cellWidth = state.world.width / state.paintGrid.columns;
  const barrierEnd = DELIVERY2_LEVEL.obstacles![0]!.x + DELIVERY2_LEVEL.obstacles![0]!.width;
  const reachableBeforeCrossing = state.paintCells.filter(
    (cell, index) =>
      !cell.blocked &&
      ((index % state.paintGrid.columns) + 0.5) * cellWidth <=
        barrierEnd + DELIVERY2_LEVEL.paint.radius,
  ).length;
  expect(reachableBeforeCrossing / (state.paintCells.length - blocked.length)).toBeLessThan(
    DELIVERY2_LEVEL.victoryFraction,
  );
});
