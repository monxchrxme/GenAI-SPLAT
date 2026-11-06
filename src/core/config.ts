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
