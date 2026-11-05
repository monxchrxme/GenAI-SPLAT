export type AgentId = `agent-${number}`;
export type GroupId = `group-${number}`;
export type FactionId = 'blue' | 'red';

export interface Agent {
  id: AgentId;
  factionId: FactionId;
  groupId: GroupId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  alive: boolean;
}

export interface Group {
  id: GroupId;
  factionId: FactionId;
  agentIds: AgentId[];
}

export interface World {
  width: number;
  height: number;
}

export interface MatchState {
  phase: 'running';
  result: null;
  tick: number;
  seed: number;
  rngState: number;
  world: World;
  agents: Agent[];
  groups: Group[];
}

export interface LevelConfig {
  readonly seed: number;
  readonly fixedStepMs: number;
  readonly world: Readonly<World>;
  readonly spawn: {
    readonly count: number;
    readonly columns: number;
    readonly centerX: number;
    readonly centerY: number;
    readonly spacing: number;
    readonly jitter: number;
  };
  readonly initialHp: number;
}

export interface ClockConfig {
  readonly stepMs: number;
  readonly maxFrameMs: number;
  readonly maxStepsPerFrame: number;
}

// S0 has only a session command. Gameplay commands are introduced in their stages.
export interface GameCommand {
  readonly type: 'restart';
  readonly tick: number;
}

export type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

export type Snapshot = DeepReadonly<MatchState>;
