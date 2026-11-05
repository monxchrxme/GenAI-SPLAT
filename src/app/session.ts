import { FixedStepClock } from '../core/fixedStepClock';
import type { ClockConfig, GameCommand, LevelConfig, Snapshot } from '../core/types';
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

  submit(type: GameCommand['type']): void {
    const command: GameCommand = Object.freeze({ type, tick: this.simulation.tick });
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
      this.clock.advance(elapsedMs, () => this.simulation.step());
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
