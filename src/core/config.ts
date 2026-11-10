import type { ClockConfig, LevelConfig } from './types';
import type { DrawingConfig } from './polyline';

// [P] S1 action 2: sampling bounds, not movement/balance approval.
export const DRAWING: DrawingConfig = Object.freeze({
  minSegment: 8,
  minLength: 24,
  maxLength: 3200,
  maxPoints: 256,
  dragThresholdPx: 4,
});

// [P] D-10: reversible S0 test dimensions, spawn and technical timing.
export const S0_LEVEL: LevelConfig = Object.freeze({
  // [P] S1 action 5: a visual cue for stretched target spacing, never a split threshold.
  victoryFraction: 0.6, // [P] objective threshold, pending balancing
  paint: Object.freeze({
    columns: 20,
    rows: 10,
    radius: 90,
    ratePerSecond: 0.5,
    ownerThreshold: 0.6,
  }), // [P] S4 territory prototype
  mergeHighlightTicks: 45, // [P] short feedback after merging
  mergeDistance: 80, // [P] centre-to-centre distance in world units
  tension: Object.freeze({ neighborGap: 48, durationTicks: 90 }),
  // [P] S1 action 4, world units / seconds. Soft steering, not rigid collision physics.
  movement: Object.freeze({
    maxSpeed: 180,
    arrivalGain: 4,
    settleDistance: 0.1,
    separationRadius: 26,
    separationStrength: 0.65,
  }),
  seed: 20261105,
  fixedStepMs: 1000 / 60,
  world: Object.freeze({ width: 1600, height: 1000 }),
  spawn: Object.freeze({
    count: 40,
    columns: 8,
    centerX: 430,
    centerY: 500,
    spacing: 34,
    jitter: 2,
  }),
  initialHp: 1,
  // [P] S1: direct hit tolerance and local gaps between nearby same-group agents, in world units.
  selection: Object.freeze({ hitRadius: 16, neighborDistance: 60 }),
});

export const S0_CLOCK: ClockConfig = Object.freeze({
  stepMs: S0_LEVEL.fixedStepMs,
  maxFrameMs: 250,
  maxStepsPerFrame: 8,
});

const FINAL_POST_DEFENSE = Object.freeze({ radius: 300, leash: 200 }); // [P]

// [P] S5 trial setup; these values and enemy behaviour need playtesting.
export const GAME_LEVEL: LevelConfig = Object.freeze({
  ...S0_LEVEL,
  world: Object.freeze({ width: 6000, height: 1000 }),
  paint: Object.freeze({
    ...S0_LEVEL.paint,
    columns: 75,
    firstCaptureRatePerSecond: 0.8, // [P] allow a moving formation to claim fresh ground
  }),
  checkpoint: Object.freeze({ x: 3520, y: 400, width: 160, height: 200 }), // [P] second-sector checkpoint
  checkpointViewEnd: 4000, // [P] reveal the third sector after securing the checkpoint
  objective: Object.freeze({ x: 5600, y: 400, width: 320, height: 200 }), // [P] final capture area
  obstacles: Object.freeze([
    Object.freeze({ x: 1440, y: 0, width: 80, height: 200 }),
    Object.freeze({ x: 1440, y: 400, width: 80, height: 200 }),
    Object.freeze({ x: 1440, y: 800, width: 80, height: 200 }),
    Object.freeze({ x: 3040, y: 0, width: 80, height: 200 }),
    Object.freeze({ x: 3040, y: 400, width: 80, height: 200 }),
    Object.freeze({ x: 3040, y: 800, width: 80, height: 200 }),
    Object.freeze({ x: 4000, y: 0, width: 160, height: 200 }),
    Object.freeze({ x: 4000, y: 800, width: 160, height: 200 }),
    Object.freeze({ x: 4480, y: 400, width: 160, height: 200 }),
  ]),
  // [P] Three sectors: one large, then one large and two small, then three medium posts.
  enemyPosts: Object.freeze([
    { count: 36, columns: 6, centerX: 1900, centerY: 500 },
    { count: 24, columns: 6, centerX: 3600, centerY: 500 },
    { count: 8, columns: 4, centerX: 3500, centerY: 220 },
    { count: 8, columns: 4, centerX: 3500, centerY: 780 },
    { count: 8, columns: 4, centerX: 5200, centerY: 220, localDefense: FINAL_POST_DEFENSE },
    { count: 8, columns: 4, centerX: 5400, centerY: 500, localDefense: FINAL_POST_DEFENSE },
    { count: 8, columns: 4, centerX: 5200, centerY: 780, localDefense: FINAL_POST_DEFENSE },
    { count: 1, columns: 1, centerX: 5580, centerY: 300, deviant: true },
    { count: 1, columns: 1, centerX: 5580, centerY: 700, deviant: true },
  ]),
  deviant: Object.freeze({
    hp: 8,
    speedFactor: 1.35,
    attackRange: 40,
    attackCooldown: 45,
    threatRadius: 320,
    defenseDepth: 240,
  }), // [P]
  // [P] Joined rectangles give the starting water a stepped, non-straight shore.
  shorePonds: Object.freeze([
    { x: 0, y: 0, width: 80, height: 1000 },
    { x: 80, y: 900, width: 80, height: 100 },
    { x: 80, y: 0, width: 160, height: 100 },
    { x: 240, y: 0, width: 160, height: 200 },
    { x: 400, y: 0, width: 160, height: 100 },
    { x: 560, y: 0, width: 160, height: 200 },
    { x: 160, y: 900, width: 160, height: 100 },
    { x: 320, y: 800, width: 160, height: 200 },
    { x: 480, y: 900, width: 160, height: 100 },
    { x: 640, y: 800, width: 160, height: 200 },
  ]),
  ponds: Object.freeze({
    count: 2,
    candidates: [
      { x: 2240, y: 0, width: 160, height: 100 },
      { x: 2480, y: 900, width: 160, height: 100 },
      { x: 3760, y: 0, width: 160, height: 100 },
      { x: 4720, y: 900, width: 160, height: 100 },
    ],
  }),
  randomWalls: Object.freeze({
    count: 3,
    candidates: [
      { x: 800, y: 0, width: 160, height: 100 },
      { x: 1040, y: 900, width: 160, height: 100 },
      { x: 2320, y: 400, width: 160, height: 100 },
      { x: 2720, y: 0, width: 160, height: 100 },
      { x: 2720, y: 900, width: 160, height: 100 },
      { x: 3840, y: 400, width: 160, height: 100 },
      { x: 4800, y: 0, width: 160, height: 100 },
    ],
  }),
  hazards: Object.freeze({
    slow: [
      { x: 800, y: 500, radius: 80 },
      { x: 1120, y: 245, radius: 58 },
      { x: 1120, y: 755, radius: 58 },
      { x: 1750, y: 300 },
      { x: 3300, y: 700 },
      { x: 5100, y: 500 },
    ],
    mines: [
      { x: 1780, y: 690 },
      { x: 3300, y: 300 },
      { x: 3820, y: 700 },
      { x: 4920, y: 300 },
      { x: 5350, y: 800 },
    ],
    cannons: [
      { x: 3700, y: 100 },
      { x: 5000, y: 900 },
    ],
    mineCount: 3,
    slowRadius: 90,
    slowFactor: 0.55,
    mineRadius: 65,
    minePaintCells: 3,
    mineDamage: 1,
    cannonRange: 260,
    cannonDamage: 1,
    cannonCooldown: 15,
    cannonSweepTicks: 240,
    cannonProjectileSpeed: 360,
    cannonHitRadius: 12,
  }),
  initialHp: 3,
  reinforcement: Object.freeze({ cost: 5, count: 2, maxBlue: 40 }), // [P] pending balance review
  enemy: Object.freeze({
    count: 36,
    columns: 6,
    centerX: 1900,
    centerY: 500,
    spacing: 30,
    threatRadius: 420,
    advanceDistance: 80,
    decisionTicks: 60,
    splitDistance: 300,
    minSquadSize: 8,
    defenseDepth: 250,
    disadvantageRatio: 1.3,
    guardLanes: [300, 700] as const,
  }),
  combat: Object.freeze({ range: 33, damage: 1, cooldownTicks: 60, hitFeedbackTicks: 8 }),
});
