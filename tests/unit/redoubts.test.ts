import { expect, it } from 'vitest';
import { REDOUBTS } from '../../src/levels/redoubts';
import { enemyCommands } from '../../src/enemy/controller';
import { createInitialState } from '../../src/simulation/initialState';
import { assertInvariants } from '../../src/simulation/invariants';
import { objectiveCells, updateObjective } from '../../src/simulation/objective';
import { findRoute, pointBlocked, UNIT_CLEARANCE } from '../../src/simulation/obstacles';
import { Simulation } from '../../src/simulation/simulation';

it('starts all courtyards and three deviants on clear ground without waking distant posts', () => {
  const sim = new Simulation(REDOUBTS);
  const initial = sim.getSnapshot();
  expect(initial.world).toEqual({ width: 7200, height: 1000 });
  expect(initial.agents.filter((agent) => agent.factionId === 'red')).toHaveLength(168);
  expect(initial.agents.filter((agent) => agent.variant === 'deviant')).toHaveLength(3);
  expect(initial.groups.filter((group) => group.factionId === 'red')).toHaveLength(17);
  for (let tick = 0; tick < 180; tick++) sim.step();
  const idle = sim.getSnapshot();
  for (const state of [initial, idle]) {
    expect(
      state.agents.every((agent) => !pointBlocked(agent, state.obstacles, UNIT_CLEARANCE)),
    ).toBe(true);
    expect(state.agents.every((agent) => agent.alive && agent.hp > 0)).toBe(true);
    expect(state.reinforcementCredits).toBe(0);
    assertInvariants(state);
  }
});

it('allows both approaches to each courtyard before its camera boundary opens', () => {
  const state = createInitialState(REDOUBTS);
  const approaches = [
    [
      [780, 300],
      [2040, 700],
    ],
    [
      [2880, 730],
      [3720, 400],
    ],
    [
      [4300, 500],
      [5120, 120],
      [5120, 880],
    ],
  ];
  for (const [index, checkpoint] of state.checkpoints.entries()) {
    const world = { ...state.world, width: checkpoint.viewEnd! };
    const target = { x: checkpoint.area.x + 80, y: checkpoint.area.y + 100 };
    for (const [x, y] of approaches[index]!) {
      const route = findRoute({ x: x!, y: y! }, target, world, state.obstacles);
      expect(route).not.toBeNull();
      expect(route!.every((point) => point.x <= world.width)).toBe(true);
    }
    const cells = objectiveCells(state, checkpoint.area);
    expect(cells).toHaveLength(4);
    expect(cells.every((cell) => !cell.blocked)).toBe(true);
  }
  expect(objectiveCells(state, state.objective!.area)).toHaveLength(8);
  for (const y of [120, 500, 850]) {
    expect(
      findRoute({ x: 6460, y }, { x: 6960, y: 500 }, state.world, state.obstacles),
    ).not.toBeNull();
  }
});

it.each([0, 1, 2, 3])(
  'keeps targets and rest areas safe when mine slot %i is omitted',
  (omitted) => {
    const hazards = REDOUBTS.hazards!;
    const config = {
      ...REDOUBTS,
      hazards: { ...hazards, mines: hazards.mines.filter((_, i) => i !== omitted) },
    };
    const state = createInitialState(config);
    const restAreas = [
      { x: 2000, y: 480, width: 200, height: 340 },
      { x: 3760, y: 300, width: 240, height: 350 },
      { x: 5520, y: 200, width: 280, height: 280 },
    ];
    const protectedAreas = [
      ...state.checkpoints.map((point) => point.area),
      state.objective!.area,
      ...restAreas,
    ];
    expect(state.hazards.filter((hazard) => hazard.kind === 'mine')).toHaveLength(3);
    for (const mine of config.hazards.mines) {
      expect(pointBlocked(mine, state.obstacles, UNIT_CLEARANCE)).toBe(false);
      for (const area of protectedAreas) {
        expect(pointBlocked(mine, [area], hazards.mineRadius)).toBe(false);
        for (let row = 0; row < state.paintGrid.rows; row++) {
          for (let column = 0; column < state.paintGrid.columns; column++) {
            const inBlastPaint =
              Math.abs(column - Math.floor(mine.x / 80)) <= hazards.minePaintCells &&
              Math.abs(row - Math.floor(mine.y / 100)) <= hazards.minePaintCells;
            const intersectsArea =
              column * 80 < area.x + area.width &&
              (column + 1) * 80 > area.x &&
              row * 100 < area.y + area.height &&
              (row + 1) * 100 > area.y;
            expect(inBlastPaint && intersectsArea).toBe(false);
          }
        }
      }
    }
    for (const cannon of hazards.cannons) {
      for (const area of protectedAreas) {
        const dx = Math.max(area.x - cannon.x, cannon.x - area.x - area.width, 0);
        const dy = Math.max(area.y - cannon.y, cannon.y - area.y - area.height, 0);
        expect(Math.hypot(dx, dy)).toBeGreaterThan(hazards.cannonRange + hazards.cannonHitRadius);
      }
    }
  },
);

it('latches three checkpoints in order and requires the final area to stay blue', () => {
  const state = createInitialState(REDOUBTS);
  const zones = [...state.checkpoints.map((point) => point.area), state.objective!.area];
  for (const cell of objectiveCells(state, zones[3]!)) cell.owner = 'blue';
  for (const cell of objectiveCells(state, zones[2]!)) cell.owner = 'blue';
  updateObjective(state);
  expect(state.checkpoints.map((point) => point.captured)).toEqual([false, false, false]);
  for (let i = 0; i < 3; i++) {
    for (const cell of objectiveCells(state, zones[i]!)) cell.owner = 'blue';
    updateObjective(state);
    expect(state.checkpoints[i]!.captured).toBe(true);
  }
  for (const area of zones) for (const cell of objectiveCells(state, area)) cell.owner = 'red';
  updateObjective(state);
  expect(state.checkpoints.every((point) => point.captured)).toBe(true);
  expect(state.objective!.captured).toBe(false);
});

it('lets a lower flank bait draw the checkpoint deviant without also waking its garrison', () => {
  const initial = createInitialState(REDOUBTS);
  const state = {
    ...initial,
    agents: initial.agents.map((agent, index) =>
      index === 0 ? { ...agent, x: 5460, y: 700 } : agent,
    ),
  };
  const commands = enemyCommands(state, REDOUBTS);
  const centerOfOrder = (post: number) => {
    const group = state.groups.find((group) => group.enemyPost === post)!;
    const order = commands.find(
      (command) => command.type === 'enemy-formation' && command.groupId === group.id,
    );
    if (order?.type !== 'enemy-formation') throw new Error('Missing post order');
    return order.points.reduce((sum, point) => sum + point.x, 0) / order.points.length;
  };
  expect(centerOfOrder(7)).toBe(5460);
  expect(centerOfOrder(8)).toBe(5140);
});

it.each([
  { name: 'lower', x: 5280, y: 630 },
  { name: 'upper', x: 5240, y: 365 },
  { name: 'left', x: 5160, y: 450 },
  { name: 'right', x: 5400, y: 550 },
])(
  'the third-checkpoint deviant pursues and attacks a painter from the $name approach',
  ({ x, y }) => {
    const config = {
      ...REDOUBTS,
      initialHp: 100,
      spawn: { ...REDOUBTS.spawn, count: 1, columns: 1, centerX: x, centerY: y, jitter: 0 },
    };
    const sim = new Simulation(config);
    const initial = sim.getSnapshot();
    const defender = initial.agents.find((agent) => agent.variant === 'deviant')!;
    for (let tick = 0; tick < 180; tick++) sim.step();
    const state = sim.getSnapshot();
    const attacked = state.agents.find((agent) => agent.id === defender.id)!;
    expect(attacked.nextAttackTick).toBeGreaterThan(0);
    expect(state.agents[0]!.hp).toBeLessThan(100);
    expect(Math.hypot(attacked.x - defender.x, attacked.y - defender.y)).toBeGreaterThan(0);
    assertInvariants(state);
  },
);
