import type { LevelConfig, MatchState, Snapshot } from '../core/types';
import { createInitialState } from './initialState';
import { assertInvariants } from './invariants';
import { createSnapshot } from './snapshot';

export class Simulation {
  private readonly state: MatchState;

  constructor(config: LevelConfig) {
    this.state = createInitialState(config);
    assertInvariants(this.state);
  }

  step(): void {
    // One call is one configured fixed tick. S0 agents intentionally remain static.
    this.state.tick++;
  }

  get tick(): number {
    return this.state.tick;
  }

  getSnapshot(): Snapshot {
    return createSnapshot(this.state);
  }
}
