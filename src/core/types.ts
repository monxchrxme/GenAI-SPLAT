export type AgentId = `agent-${number}`;
export type GroupId = `group-${number}`;
export type FactionId = 'blue' | 'red';

export interface Point {
  readonly x: number;
  readonly y: number;
}

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
  formation?: Formation;
  tensionUntilTick?: number;
}

export interface FormationSlot extends Point {
  readonly agentId: AgentId;
  readonly index: number;
}

export interface Formation {
  points: Point[];
  slots: FormationSlot[];
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
  selectedGroupId: GroupId | null;
}

export interface LevelConfig {
  readonly tension: TensionConfig;
  readonly movement: MovementConfig;
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
  readonly selection: SelectionConfig;
}

export interface SelectionConfig {
  readonly hitRadius: number;
  readonly neighborDistance: number;
}

export interface TensionConfig {
  readonly neighborGap: number;
  readonly durationTicks: number;
}

export interface MovementConfig {
  readonly maxSpeed: number;
  readonly arrivalGain: number;
  readonly settleDistance: number;
  readonly separationRadius: number;
  readonly separationStrength: number;
}

export interface ClockConfig {
  readonly stepMs: number;
  readonly maxFrameMs: number;
  readonly maxStepsPerFrame: number;
}

export type CommandIntent =
  | { readonly type: 'restart' }
  | { readonly type: 'cut'; readonly groupId: GroupId; readonly points: readonly Point[] }
  | { readonly type: 'select-group'; readonly point: Point }
  | { readonly type: 'select-group-id'; readonly groupId: GroupId | null }
  | {
      readonly type: 'set-formation';
      readonly groupId: GroupId;
      readonly points: readonly Point[];
    };

export type GameCommand = CommandIntent & { readonly tick: number };

export type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

export type Snapshot = DeepReadonly<MatchState>;
