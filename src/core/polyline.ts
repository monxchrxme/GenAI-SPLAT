import type { Point } from './types';

export interface DrawingConfig {
  readonly minSegment: number;
  readonly minLength: number;
  readonly maxLength: number;
  readonly maxPoints: number;
  readonly dragThresholdPx: number;
}

export class PolylineDraft {
  private samples: Point[];
  private distance = 0;
  private capped = false;
  constructor(
    start: Point,
    private readonly config: DrawingConfig,
  ) {
    if (
      !Object.values(config).every(Number.isFinite) ||
      config.minSegment <= 0 ||
      config.minLength < config.minSegment ||
      config.maxLength < config.minLength ||
      !Number.isInteger(config.maxPoints) ||
      config.maxPoints < 2 ||
      config.dragThresholdPx <= 0 ||
      !Number.isFinite(start.x) ||
      !Number.isFinite(start.y)
    )
      throw new Error('Invalid drawing configuration or start');
    this.samples = [{ ...start }];
  }
  add(point: Point): void {
    if (this.capped || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    const last = this.samples[this.samples.length - 1]!;
    const length = Math.hypot(point.x - last.x, point.y - last.y);
    if (length < this.config.minSegment) return;
    const remaining = this.config.maxLength - this.distance;
    const fraction = Math.min(1, remaining / length);
    this.samples.push({
      x: last.x + (point.x - last.x) * fraction,
      y: last.y + (point.y - last.y) * fraction,
    });
    this.distance += Math.min(length, remaining);
    this.capped =
      fraction < 1 ||
      this.distance >= this.config.maxLength ||
      this.samples.length >= this.config.maxPoints;
  }
  get points(): readonly Point[] {
    return this.samples.map((point) => ({ ...point }));
  }
  get valid(): boolean {
    return this.samples.length >= 2 && this.distance >= this.config.minLength;
  }
  get limited(): boolean {
    return this.capped;
  }
}
