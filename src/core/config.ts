import type { ClockConfig, LevelConfig } from './types';

// [P] D-10: reversible S0 test dimensions, spawn and technical timing.
export const S0_LEVEL: LevelConfig = Object.freeze({
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
});

export const S0_CLOCK: ClockConfig = Object.freeze({
  stepMs: S0_LEVEL.fixedStepMs,
  maxFrameMs: 250,
  maxStepsPerFrame: 8,
});
