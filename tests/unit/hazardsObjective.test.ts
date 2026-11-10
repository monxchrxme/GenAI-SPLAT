import { expect, it } from 'vitest';
import { GAME_LEVEL, S0_CLOCK, S0_LEVEL } from '../../src/core/config';
import { Session } from '../../src/app/session';
import { Simulation } from '../../src/simulation/simulation';
import { createInitialState } from '../../src/simulation/initialState';
import { updateHazards } from '../../src/simulation/hazards';
import { pointBlocked, segmentClear, UNIT_CLEARANCE } from '../../src/simulation/obstacles';
import { assertInvariants } from '../../src/simulation/invariants';
import { updateObjective } from '../../src/simulation/objective';

const settings = GAME_LEVEL.hazards!;
const solo = {
  ...S0_LEVEL,
  spawn: { ...S0_LEVEL.spawn, count: 1, columns: 1, centerX: 440, centerY: 450, jitter: 0 },
  initialHp: 3,
};

it('places reproducible ponds and mines from safe candidates while preserving both main routes', () => {
  for (const seed of [1, 2, 3, 20261105, 123456]) {
    const level = { ...GAME_LEVEL, seed };
    const a = new Simulation(level).getSnapshot();
    expect(new Simulation(level).getSnapshot()).toEqual(a);
    expect(a.ponds).toHaveLength(12);
    expect(a.obstacles).toHaveLength(GAME_LEVEL.obstacles!.length + 15);
    for (const y of [300, 700]) {
      expect(segmentClear({ x: 200, y }, { x: 1300, y }, a.obstacles, UNIT_CLEARANCE)).toBe(true);
    }
    for (const pond of GAME_LEVEL.shorePonds!) {
      expect(
        pointBlocked({ x: pond.x + pond.width / 2, y: pond.y + pond.height / 2 }, a.obstacles),
      ).toBe(true);
    }
    expect(a.hazards.filter((h) => h.kind === 'mine')).toHaveLength(3);
    expect(
      a.hazards
        .filter((h) => h.kind === 'slow')
        .slice(0, 3)
        .map((h) => [h.x, h.y, h.radius]),
    ).toEqual([
      [800, 500, 80],
      [1120, 245, 58],
      [1120, 755, 58],
    ]);
    for (const x of [1440, 3040])
      for (const y of [300, 700])
        expect(
          segmentClear({ x: x - 150, y }, { x: x + 150, y }, a.obstacles, UNIT_CLEARANCE),
        ).toBe(true);
    assertInvariants(a);
  }
  const arrangements = [1, 2, 3, 4, 5].map((seed) =>
    JSON.stringify(new Simulation({ ...GAME_LEVEL, seed }).getSnapshot().obstacles),
  );
  expect(new Set(arrangements).size).toBeGreaterThan(1);
});

it('replays hazards, projectiles, movement and paint from the same seed and commands', () => {
  const run = () => {
    const simulation = new Simulation(GAME_LEVEL);
    simulation.step([{ type: 'select-group-id', groupId: 'group-1', tick: 0 }]);
    simulation.step([
      { type: 'move-group', groupId: 'group-1', point: { x: 1200, y: 300 }, tick: 1 },
    ]);
    for (let tick = 0; tick < 300; tick++) simulation.step();
    const state = simulation.getSnapshot();
    assertInvariants(state);
    return state;
  };
  expect(run()).toEqual(run());
});

it('routes an actual unit toward the beginning shore without entering water', () => {
  const level = { ...solo, shorePonds: GAME_LEVEL.shorePonds! };
  const sim = new Simulation(level);
  sim.step([{ type: 'select-group-id', groupId: 'group-1', tick: 0 }]);
  sim.step([{ type: 'move-group', groupId: 'group-1', point: { x: 320, y: 100 }, tick: 1 }]);
  for (let i = 0; i < 300; i++) {
    sim.step();
    const state = sim.getSnapshot();
    expect(pointBlocked(state.agents[0]!, state.ponds, UNIT_CLEARANCE)).toBe(false);
  }
  expect(sim.getSnapshot().agents[0]!.y).toBeLessThan(450);
});

it('detonates a mine once, damages blue and paints nearby unblocked cells red', () => {
  const level = {
    ...solo,
    hazards: { ...settings, slow: [], cannons: [], mines: [{ x: 440, y: 450 }], mineCount: 1 },
  };
  const state = createInitialState(level);
  updateHazards(state, level);
  expect(state.agents[0]!.hp).toBe(2);
  expect(state.hazards[0]!.active).toBe(false);
  expect(
    state.paintCells.filter((cell) => cell.owner === 'red' && cell.control === -1),
  ).toHaveLength(49);
  updateHazards(state, level);
  expect(state.agents[0]!.hp).toBe(2);
  assertInvariants(state);
});

it('cleans up a mine death and records defeat once', () => {
  const level = {
    ...solo,
    initialHp: 1,
    combat: GAME_LEVEL.combat!,
    hazards: { ...settings, slow: [], cannons: [], mines: [{ x: 440, y: 450 }], mineCount: 1 },
  };
  const simulation = new Simulation(level);
  simulation.step([{ type: 'select-group-id', groupId: 'group-1', tick: 0 }]);
  const lost = simulation.getSnapshot();
  expect(lost.result).toBe('defeat');
  expect(lost.selectedGroupId).toBeNull();
  expect(lost.groups).toHaveLength(0);
  assertInvariants(lost);
  simulation.step();
  expect(simulation.getSnapshot()).toEqual(lost);
});

it('fires and advances projectiles without a target, repeatedly, while sweeping 180 degrees', () => {
  const level = {
    ...solo,
    hazards: { ...settings, slow: [], mines: [], mineCount: 0, cannons: [{ x: 100, y: 100 }] },
  };
  const state = createInitialState(level);
  updateHazards(state, level);
  expect(state.projectiles).toHaveLength(1);
  expect(state.projectiles[0]!.x).toBeGreaterThan(100);
  state.tick = settings.cannonCooldown;
  updateHazards(state, level);
  expect(state.projectiles).toHaveLength(2);
  expect(state.projectiles[1]!.vy).toBeGreaterThan(0);
});

it('a cannon projectile damages a blue unit and disappears on contact', () => {
  const level = {
    ...solo,
    spawn: { ...solo.spawn, centerX: 106, centerY: 100 },
    hazards: { ...settings, slow: [], mines: [], mineCount: 0, cannons: [{ x: 100, y: 100 }] },
  };
  const state = createInitialState(level);
  updateHazards(state, level);
  expect(state.agents[0]!.hp).toBe(2);
  expect(state.projectiles).toHaveLength(0);
});

it('spawns larger-type deviant defenders with configured health', () => {
  const state = new Simulation(GAME_LEVEL).getSnapshot();
  const deviants = state.agents.filter((agent) => agent.variant === 'deviant');
  expect(deviants).toHaveLength(2);
  expect(
    deviants.every((agent) => agent.factionId === 'red' && agent.hp === GAME_LEVEL.deviant!.hp),
  ).toBe(true);
  expect(
    deviants.map((agent) => state.groups.find((g) => g.id === agent.groupId)?.enemyPost),
  ).toEqual([7, 8]);
});

it('loses and regains the final objective when a cell is recaptured', () => {
  const level = { ...solo, objective: { x: 1200, y: 400, width: 80, height: 100 } };
  const state = createInitialState(level);
  const cell = state.paintCells.find((item) => item.owner === 'red')!;
  cell.owner = 'blue';
  cell.control = 1;
  updateObjective(state);
  expect(state.objective?.captured).toBe(true);
  cell.owner = 'red';
  cell.control = -1;
  updateObjective(state);
  expect(state.objective?.captured).toBe(false);
});

it('reduces movement speed inside a slow zone', () => {
  const level = {
    ...solo,
    hazards: { ...settings, slow: [{ x: 440, y: 450 }], mines: [], cannons: [], mineCount: 0 },
  };
  const step = (withSlow: boolean) => {
    const session = new Session(withSlow ? level : solo, S0_CLOCK);
    session.submit({ type: 'select-group-id', groupId: 'group-1' });
    session.submit({ type: 'move-group', groupId: 'group-1', point: { x: 900, y: 450 } });
    return session.advance(S0_CLOCK.stepMs).agents[0]!.x;
  };
  expect(step(true) - 440).toBeLessThan(step(false) - 440);
  expect(step(true)).toBeGreaterThan(440);
});

it('slows inside square corners but not just beyond its edge', () => {
  const distance = (x: number, withSlow: boolean) => {
    const level = {
      ...solo,
      spawn: { ...solo.spawn, centerX: x, centerY: 530 },
      ...(withSlow
        ? {
            hazards: {
              ...settings,
              slow: [{ x: 440, y: 450 }],
              mines: [],
              cannons: [],
              mineCount: 0,
            },
          }
        : {}),
    };
    const session = new Session(level, S0_CLOCK);
    session.submit({ type: 'select-group-id', groupId: 'group-1' });
    session.submit({ type: 'move-group', groupId: 'group-1', point: { x: 900, y: 530 } });
    return session.advance(S0_CLOCK.stepMs).agents[0]!.x - x;
  };
  expect(distance(520, true)).toBeLessThan(distance(520, false));
  expect(distance(531, true)).toBeCloseTo(distance(531, false), 8);
});

it('connects the left edge of the water to both initial shorelines', () => {
  const ponds = GAME_LEVEL.shorePonds!;
  const connected = new Set([0]);
  let previousSize = 0;
  while (connected.size !== previousSize) {
    previousSize = connected.size;
    for (const i of [...connected]) {
      const a = ponds[i]!;
      for (const [j, b] of ponds.entries()) {
        if (
          a.x <= b.x + b.width &&
          b.x <= a.x + a.width &&
          a.y <= b.y + b.height &&
          b.y <= a.y + a.height
        )
          connected.add(j);
      }
    }
  }
  expect(connected.size).toBe(ponds.length);
  expect(ponds[0]).toMatchObject({ x: 0, y: 0, height: GAME_LEVEL.world.height });
});

it('requires both 60%-style territory threshold and the captured final point, and Restart resets it', () => {
  const level = {
    ...solo,
    victoryFraction: 0.005,
    objective: { x: 1200, y: 400, width: 80, height: 100 },
  };
  const session = new Session(level, S0_CLOCK);
  expect(session.getSnapshot().objective?.captured).toBe(false);
  for (let i = 0; i < 300; i++) session.advance(S0_CLOCK.stepMs);
  expect(session.getSnapshot().result).toBeNull();
  session.submit({ type: 'select-group-id', groupId: 'group-1' });
  session.submit({ type: 'move-group', groupId: 'group-1', point: { x: 1240, y: 450 } });
  for (let i = 0; i < 900 && session.getSnapshot().result === null; i++)
    session.advance(S0_CLOCK.stepMs);
  expect(session.getSnapshot().result).toBe('victory');
  expect(session.getSnapshot().objective?.captured).toBe(true);
  session.submit('restart');
  const restarted = session.advance(S0_CLOCK.stepMs);
  expect(restarted.result).toBeNull();
  expect(restarted.objective?.captured).toBe(false);
});

it('requires both points, wins below the old territory threshold and clears them on Restart', () => {
  const level = {
    ...solo,
    checkpoint: { x: 720, y: 400, width: 80, height: 100 },
    objective: { x: 1200, y: 400, width: 80, height: 100 },
  };
  const session = new Session(level, S0_CLOCK);
  const go = (x: number) => {
    session.submit({ type: 'select-group-id', groupId: 'group-1' });
    session.submit({ type: 'move-group', groupId: 'group-1', point: { x, y: 450 } });
    let state = session.getSnapshot();
    for (let i = 0; i < 600 && !state.result; i++) state = session.advance(S0_CLOCK.stepMs);
    return state;
  };
  const finalFirst = go(1240);
  expect(finalFirst.objective?.captured).toBe(true);
  expect(finalFirst.checkpoint?.captured).toBe(false);
  expect(finalFirst.result).toBeNull();
  const won = go(760);
  expect(won.checkpoint?.captured).toBe(true);
  expect(won.result).toBe('victory');
  expect(
    won.paintCells.filter((cell) => cell.owner === 'blue').length / won.paintCells.length,
  ).toBeLessThan(level.victoryFraction);
  session.submit('restart');
  const reset = session.advance(0);
  expect(reset.checkpoint?.captured).toBe(false);
  expect(reset.objective?.captured).toBe(false);
  expect(reset.result).toBeNull();
});

it('remembers a secured checkpoint if its paint is later lost', () => {
  const state = createInitialState({
    ...solo,
    checkpoint: { x: 720, y: 400, width: 80, height: 100 },
  });
  const cell = state.paintCells.find((item) => item.owner === 'red')!;
  expect(state.checkpoint?.captured).toBe(false);
  Object.assign(cell, { owner: 'blue', control: 1 });
  updateObjective(state);
  expect(state.checkpoint?.captured).toBe(true);
  Object.assign(cell, { owner: 'red', control: -1 });
  updateObjective(state);
  expect(state.checkpoint?.captured).toBe(true);
});
