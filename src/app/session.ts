import { FixedStepClock } from '../core/fixedStepClock';
import type { ClockConfig, CommandIntent, GameCommand, LevelConfig, Snapshot } from '../core/types';
import { Simulation } from '../simulation/simulation';

export class Session {
  private simulation: Simulation;
  private readonly clock: FixedStepClock;
  private pending: GameCommand[] = [];
  private history: GameCommand[] = [];
  private generation = 0;

  constructor(
    private readonly level: LevelConfig,
    clockConfig: ClockConfig,
  ) {
    if (level.fixedStepMs !== clockConfig.stepMs) throw new Error('Mismatched fixed timestep');
    this.simulation = new Simulation(level);
    this.clock = new FixedStepClock(clockConfig);
  }

  submit(intent: CommandIntent | 'restart'): void {
    const value = typeof intent === 'string' ? { type: intent } : intent;
    const tick = this.simulation.tick;
    const command: GameCommand =
      value.type === 'restart'
        ? Object.freeze({ type: value.type, tick })
        : value.type === 'split' || value.type === 'reinforce'
          ? Object.freeze({ ...value, tick })
          : value.type === 'merge'
            ? Object.freeze({ ...value, tick })
            : value.type === 'select-group-id'
              ? Object.freeze({ type: value.type, tick, groupId: value.groupId })
              : value.type === 'select-group' || value.type === 'move-group'
                ? Object.freeze({
                    ...value,
                    tick,
                    point: Object.freeze({ ...value.point }),
                  })
                : Object.freeze({
                    type: value.type,
                    tick,
                    groupId: value.groupId,
                    points: Object.freeze(value.points.map((point) => Object.freeze({ ...point }))),
                  });
    this.pending.push(command);
    this.history.push(command);
  }

  advance(elapsedMs: number): Snapshot {
    if (this.pending.some((command) => command.type === 'restart')) {
      this.simulation = new Simulation(this.level);
      this.clock.reset();
      this.pending = [];
      this.history = [];
      this.generation++;
    } else {
      this.clock.advance(elapsedMs, () => {
        this.simulation.step(this.pending);
        this.pending = [];
      });
    }
    return this.getSnapshot();
  }

  discardFrameTime(): void {
    this.clock.reset();
  }

  get restartCount(): number {
    return this.generation;
  }

  get commandLog(): readonly GameCommand[] {
    return Object.freeze([...this.history]);
  }

  getSnapshot(): Snapshot {
    return this.simulation.getSnapshot();
  }
}
