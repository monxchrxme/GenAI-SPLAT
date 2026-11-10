import { SeededRng } from '../core/rng';
import type { Agent, Group, GroupId, LevelConfig, MatchState } from '../core/types';

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
  const groups: Group[] = [
    { id: groupId, factionId: 'blue', agentIds: agents.map((agent) => agent.id) },
  ];
  const enemy = config.enemy;
  if (enemy) {
    const enemyGroupId: GroupId = 'group-1000';
    const start = agents.length;
    const enemyAgents: Agent[] = Array.from({ length: enemy.count }, (_, index) => ({
      id: `agent-${start + index + 1}`,
      factionId: 'red',
      groupId: enemyGroupId,
      x: enemy.centerX + ((index % enemy.columns) - (enemy.columns - 1) / 2) * enemy.spacing,
      y:
        enemy.centerY +
        (Math.floor(index / enemy.columns) - (Math.ceil(enemy.count / enemy.columns) - 1) / 2) *
          enemy.spacing,
      vx: 0,
      vy: 0,
      hp: config.initialHp,
      alive: true,
    }));
    agents.push(...enemyAgents);
    groups.push({
      id: enemyGroupId,
      factionId: 'red',
      agentIds: enemyAgents.map((agent) => agent.id),
    });
  }
  return {
    phase: 'running',
    result: null,
    tick: 0,
    seed: config.seed,
    rngState: rng.state,
    world: { ...config.world },
    obstacles: (config.obstacles ?? []).map((obstacle) => ({ ...obstacle })),
    paintGrid: { columns: config.paint.columns, rows: config.paint.rows },
    paintCells: Array.from({ length: config.paint.columns * config.paint.rows }, (_, index) => {
      const width = config.world.width / config.paint.columns;
      const height = config.world.height / config.paint.rows;
      const x = (index % config.paint.columns) * width;
      const y = Math.floor(index / config.paint.columns) * height;
      const blocked = (config.obstacles ?? []).some(
        (obstacle) =>
          x < obstacle.x + obstacle.width &&
          x + width > obstacle.x &&
          y < obstacle.y + obstacle.height &&
          y + height > obstacle.y,
      );
      return { control: 0, owner: null, ...(blocked ? { blocked: true } : {}) };
    }),
    agents,
    groups,
    reinforcementCredits: 0,
    selectedGroupId: null,
    merge: null,
  };
}
