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

// [P] S5 trial setup; these values and enemy behaviour need playtesting.
export const GAME_LEVEL: LevelConfig = Object.freeze({
  ...S0_LEVEL,
  world: Object.freeze({ width: 3200, height: 1000 }),
  paint: Object.freeze({ ...S0_LEVEL.paint, columns: 40 }),
  obstacles: Object.freeze([
    Object.freeze({ x: 1440, y: 0, width: 80, height: 200 }),
    Object.freeze({ x: 1440, y: 400, width: 80, height: 200 }),
    Object.freeze({ x: 1440, y: 800, width: 80, height: 200 }),
  ]),
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
