import type { ClockConfig } from './types';

const STEP_EPSILON = 1e-7;

export class FixedStepClock {
  private accumulatorMs = 0;

  constructor(private readonly config: ClockConfig) {
    if (
      !Number.isFinite(config.stepMs) ||
      config.stepMs <= 0 ||
      !Number.isFinite(config.maxFrameMs) ||
      config.maxFrameMs < config.stepMs ||
      !Number.isInteger(config.maxStepsPerFrame) ||
      config.maxStepsPerFrame < 1
    ) {
      throw new Error('Invalid fixed-step clock configuration');
    }
  }

  advance(elapsedMs: number, step: () => void): number {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
      throw new Error('Frame duration must be finite and non-negative');
    }
    this.accumulatorMs += Math.min(elapsedMs, this.config.maxFrameMs);
    let steps = 0;
    while (
      this.accumulatorMs + STEP_EPSILON >= this.config.stepMs &&
      steps < this.config.maxStepsPerFrame
    ) {
      this.accumulatorMs = Math.max(0, this.accumulatorMs - this.config.stepMs);
      step();
      steps++;
    }
    // Discard whole overdue steps after a stall; never feed a variable dt to simulation.
    if (this.accumulatorMs + STEP_EPSILON >= this.config.stepMs) {
      const overdueSteps = Math.floor((this.accumulatorMs + STEP_EPSILON) / this.config.stepMs);
      this.accumulatorMs = Math.max(0, this.accumulatorMs - overdueSteps * this.config.stepMs);
    }
    return steps;
  }

  reset(): void {
    this.accumulatorMs = 0;
  }
}
