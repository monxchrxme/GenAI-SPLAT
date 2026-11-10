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
  nextAttackTick?: number;
  hitUntilTick?: number;
  variant?: 'deviant';
}

export interface Hazard extends Point {
  kind: 'slow' | 'mine' | 'cannon';
  active: boolean;
  nextFireTick: number;
  radius?: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  remaining: number;
}

export interface Group {
  id: GroupId;
  factionId: FactionId;
  agentIds: AgentId[];
  enemyPost?: number;
  formation?: Formation;
  tensionUntilTick?: number;
  mergeHighlightUntilTick?: number;
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

export interface Obstacle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface PaintCell {
  control: number;
  blocked?: boolean;
  owner: FactionId | null;
}

export interface PaintConfig {
  readonly columns: number;
  readonly rows: number;
  readonly radius: number;
  readonly ratePerSecond: number;
  readonly ownerThreshold: number;
}

export interface MatchState {
  phase: 'running' | 'finished';
  result: 'victory' | 'defeat' | null;
  tick: number;
  seed: number;
  rngState: number;
  world: World;
  obstacles: Obstacle[];
  paintGrid: { columns: number; rows: number };
  paintCells: PaintCell[];
  objective: { area: Obstacle; captured: boolean } | null;
  hazards: Hazard[];
  ponds: Obstacle[];
  projectiles: Projectile[];
  reinforcementCredits: number;
  agents: Agent[];
  groups: Group[];
  selectedGroupId: GroupId | null;
  merge: { first: GroupId; second: GroupId } | null;
}

export interface LevelConfig {
  readonly paint: PaintConfig;
  readonly obstacles?: readonly Obstacle[];
  readonly objective?: Obstacle;
  readonly enemyPosts?: readonly {
    readonly count: number;
    readonly columns: number;
    readonly centerX: number;
    readonly centerY: number;
    readonly deviant?: boolean;
    readonly localDefense?: { readonly radius: number; readonly leash: number };
  }[];
  readonly hazards?: {
    readonly slow: readonly (Point & { readonly radius?: number })[];
    readonly mines: readonly Point[];
    readonly cannons: readonly Point[];
    readonly mineCount: number;
    readonly slowRadius: number;
    readonly slowFactor: number;
    readonly mineRadius: number;
    readonly minePaintCells: number;
    readonly mineDamage: number;
    readonly cannonRange: number;
    readonly cannonDamage: number;
    readonly cannonCooldown: number;
    readonly cannonSweepTicks: number;
    readonly cannonProjectileSpeed: number;
    readonly cannonHitRadius: number;
  };
  readonly ponds?: { readonly candidates: readonly Obstacle[]; readonly count: number };
  readonly shorePonds?: readonly Obstacle[];
  readonly randomWalls?: { readonly candidates: readonly Obstacle[]; readonly count: number };
  readonly deviant?: {
    readonly hp: number;
    readonly speedFactor: number;
    readonly attackRange: number;
    readonly attackCooldown: number;
    readonly threatRadius: number;
    readonly defenseDepth: number;
  };
  readonly victoryFraction: number;
  readonly reinforcement?: {
    readonly cost: number;
    readonly count: number;
    readonly maxBlue: number;
  };
  readonly enemy?: {
    readonly count: number;
    readonly columns: number;
    readonly centerX: number;
    readonly centerY: number;
    readonly spacing: number;
    readonly threatRadius: number;
    readonly advanceDistance: number;
    readonly decisionTicks: number;
    readonly splitDistance: number;
    readonly minSquadSize: number;
    readonly defenseDepth: number;
    readonly disadvantageRatio: number;
    readonly guardLanes?: readonly [number, number];
  };
  readonly combat?: {
    readonly range: number;
    readonly damage: number;
    readonly cooldownTicks: number;
    readonly hitFeedbackTicks: number;
  };
  readonly mergeDistance: number;
  readonly mergeHighlightTicks: number;
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
  | { readonly type: 'split'; readonly groupId: GroupId }
  | { readonly type: 'reinforce'; readonly groupId: GroupId }
  | { readonly type: 'merge'; readonly groupId: GroupId; readonly targetGroupId: GroupId }
  | { readonly type: 'cut'; readonly groupId: GroupId; readonly points: readonly Point[] }
  | { readonly type: 'select-group'; readonly point: Point }
  | { readonly type: 'select-group-id'; readonly groupId: GroupId | null }
  | { readonly type: 'move-group'; readonly groupId: GroupId; readonly point: Point }
  | {
      readonly type: 'set-formation';
      readonly groupId: GroupId;
      readonly points: readonly Point[];
    };

export type GameCommand = (
  | CommandIntent
  | { readonly type: 'enemy-split'; readonly groupId: GroupId }
  | { readonly type: 'enemy-merge'; readonly first: GroupId; readonly second: GroupId }
  | {
      readonly type: 'enemy-formation';
      readonly groupId: GroupId;
      readonly points: readonly Point[];
    }
) & { readonly tick: number };

export type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

export type Snapshot = DeepReadonly<MatchState>;
