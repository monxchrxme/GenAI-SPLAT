import { SeededRng } from '../core/rng';
import type { Agent, Group, GroupId, LevelConfig, MatchState } from '../core/types';
import { objectiveContains } from './objective';

export function createInitialState(config: LevelConfig): MatchState {
  const rng = new SeededRng(config.seed);
  const environmentRng = new SeededRng((config.seed ^ 0x93ab5711) >>> 0);
  const choose = <T>(items: readonly T[], count: number): T[] => {
    const pool = [...items];
    const result: T[] = [];
    while (result.length < count && pool.length) {
      result.push(pool.splice(Math.floor(environmentRng.next() * pool.length), 1)[0]!);
    }
    return result;
  };
  const ponds = [
    ...(config.shorePonds ?? []),
    ...(config.ponds ? choose(config.ponds.candidates, config.ponds.count) : []),
  ];
  const walls = config.randomWalls
    ? choose(config.randomWalls.candidates, config.randomWalls.count)
    : [];
  const obstacles = [...(config.obstacles ?? []), ...ponds, ...walls].map((obstacle) => ({
    ...obstacle,
  }));
  const hazards = config.hazards
    ? [
        ...config.hazards.slow.map((point) => ({
          ...point,
          kind: 'slow' as const,
          active: true,
          nextFireTick: 0,
        })),
        ...choose(config.hazards.mines, config.hazards.mineCount).map((point) => ({
          ...point,
          kind: 'mine' as const,
          active: true,
          nextFireTick: 0,
        })),
        ...config.hazards.cannons.map((point) => ({
          ...point,
          kind: 'cannon' as const,
          active: true,
          nextFireTick: 0,
        })),
      ]
    : [];
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
    const posts = config.enemyPosts ?? [enemy];
    for (const [postIndex, post] of posts.entries()) {
      const isDeviant = 'deviant' in post && post.deviant;
      const enemyGroupId: GroupId = `group-${1000 + postIndex}`;
      const start = agents.length;
      const enemyAgents: Agent[] = Array.from({ length: post.count }, (_, index) => ({
        id: `agent-${start + index + 1}`,
        factionId: 'red',
        groupId: enemyGroupId,
        x: post.centerX + ((index % post.columns) - (post.columns - 1) / 2) * enemy.spacing,
        y:
          post.centerY +
          (Math.floor(index / post.columns) - (Math.ceil(post.count / post.columns) - 1) / 2) *
            enemy.spacing,
        vx: 0,
        vy: 0,
        hp: isDeviant ? (config.deviant?.hp ?? config.initialHp) : config.initialHp,
        alive: true,
        ...(isDeviant ? { variant: 'deviant' as const } : {}),
      }));
      agents.push(...enemyAgents);
      groups.push({
        id: enemyGroupId,
        factionId: 'red',
        agentIds: enemyAgents.map((agent) => agent.id),
        ...(config.enemyPosts ? { enemyPost: postIndex } : {}),
      });
    }
  }
  return {
    phase: 'running',
    result: null,
    tick: 0,
    seed: config.seed,
    rngState: rng.state,
    world: { ...config.world },
    obstacles,
    hazards,
    ponds: ponds.map((pond) => ({ ...pond })),
    projectiles: [],
    paintGrid: { columns: config.paint.columns, rows: config.paint.rows },
    objective: config.objective ? { area: { ...config.objective }, captured: false } : null,
    checkpoint: config.checkpoint ? { area: { ...config.checkpoint }, captured: false } : null,
    paintCells: Array.from({ length: config.paint.columns * config.paint.rows }, (_, index) => {
      const width = config.world.width / config.paint.columns;
      const height = config.world.height / config.paint.rows;
      const x = (index % config.paint.columns) * width;
      const y = Math.floor(index / config.paint.columns) * height;
      const blocked = obstacles.some(
        (obstacle) =>
          x < obstacle.x + obstacle.width &&
          x + width > obstacle.x &&
          y < obstacle.y + obstacle.height &&
          y + height > obstacle.y,
      );
      const inObjective = [config.checkpoint, config.objective].some(
        (area) => area && objectiveContains(area, x + width / 2, y + height / 2),
      );
      return {
        control: inObjective ? -1 : 0,
        owner: inObjective ? 'red' : null,
        ...(blocked ? { blocked: true } : {}),
      };
    }),
    agents,
    groups,
    reinforcementCredits: 0,
    selectedGroupId: null,
    merge: null,
  };
}
