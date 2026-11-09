import { SeededRng } from '../core/rng';
import type { Agent, GroupId, LevelConfig, MatchState } from '../core/types';

export function createInitialState(config: LevelConfig): MatchState {
  const rng = new SeededRng(config.seed);
  const spawn = config.spawn;
  if (
    !Number.isInteger(spawn.count) ||
    spawn.count < 1 ||
    !Number.isInteger(spawn.columns) ||
    spawn.columns < 1 ||
    !Number.isFinite(config.fixedStepMs) ||
    config.fixedStepMs <= 0
  ) {
    throw new Error('Invalid initial level configuration');
  }
  const groupId: GroupId = 'group-1';
  const rows = Math.ceil(spawn.count / spawn.columns);
  const agents: Agent[] = Array.from({ length: spawn.count }, (_, index) => ({
    id: `agent-${index + 1}`,
    factionId: 'blue',
    groupId,
    x:
      spawn.centerX +
      ((index % spawn.columns) - (spawn.columns - 1) / 2) * spawn.spacing +
      (rng.next() * 2 - 1) * spawn.jitter,
    y:
      spawn.centerY +
      (Math.floor(index / spawn.columns) - (rows - 1) / 2) * spawn.spacing +
      (rng.next() * 2 - 1) * spawn.jitter,
    vx: 0,
    vy: 0,
    hp: config.initialHp,
    alive: true,
  }));
  return {
    phase: 'running',
    result: null,
    tick: 0,
    seed: config.seed,
    rngState: rng.state,
    world: { ...config.world },
    paintGrid: { columns: config.paint.columns, rows: config.paint.rows },
    paintCells: Array.from({ length: config.paint.columns * config.paint.rows }, () => ({
      control: 0,
      owner: null,
    })),
    agents,
    groups: [{ id: groupId, factionId: 'blue', agentIds: agents.map((agent) => agent.id) }],
    selectedGroupId: null,
    merge: null,
  };
}
