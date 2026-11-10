import type { AgentId, Hazard, LevelConfig, MatchState } from '../core/types';
import { applyDamage } from './combat';
import { segmentClear } from './obstacles';

// [P] A periodic 180-degree sweep; upper and lower turrets face into the arena.
export function cannonAngle(hazard: Hazard, tick: number, config: LevelConfig): number {
  const period = config.hazards!.cannonSweepTicks;
  const phase = (tick % (period * 2)) / period;
  const arc = phase <= 1 ? phase : 2 - phase;
  return (hazard.y < config.world.height / 2 ? 1 : -1) * Math.PI * arc;
}

export function updateHazards(state: MatchState, config: LevelConfig): void {
  const settings = config.hazards;
  if (!settings) return;
  const damage = new Map<AgentId, number>();
  const addDamage = (id: AgentId, amount: number) => damage.set(id, (damage.get(id) ?? 0) + amount);
  for (const hazard of state.hazards) {
    if (!hazard.active) continue;
    if (
      hazard.kind === 'mine' &&
      state.agents.some(
        (agent) =>
          agent.alive &&
          agent.factionId === 'blue' &&
          Math.hypot(agent.x - hazard.x, agent.y - hazard.y) <= settings.mineRadius,
      )
    ) {
      hazard.active = false;
      for (const agent of state.agents)
        if (
          agent.alive &&
          agent.factionId === 'blue' &&
          Math.hypot(agent.x - hazard.x, agent.y - hazard.y) <= settings.mineRadius
        )
          addDamage(agent.id, settings.mineDamage);
      for (const [index, cell] of state.paintCells.entries()) {
        const column = index % state.paintGrid.columns;
        const row = Math.floor(index / state.paintGrid.columns);
        const mineColumn = Math.floor((hazard.x * state.paintGrid.columns) / state.world.width);
        const mineRow = Math.floor((hazard.y * state.paintGrid.rows) / state.world.height);
        if (
          !cell.blocked &&
          Math.abs(column - mineColumn) <= settings.minePaintCells &&
          Math.abs(row - mineRow) <= settings.minePaintCells
        ) {
          cell.control = -1;
          cell.owner = 'red';
        }
      }
    }
    if (hazard.kind === 'cannon' && state.tick >= hazard.nextFireTick) {
      const angle = cannonAngle(hazard, state.tick, config);
      state.projectiles.push({
        x: hazard.x,
        y: hazard.y,
        vx: Math.cos(angle) * settings.cannonProjectileSpeed,
        vy: Math.sin(angle) * settings.cannonProjectileSpeed,
        remaining: settings.cannonRange,
      });
      hazard.nextFireTick = state.tick + settings.cannonCooldown;
    }
  }
  const dt = config.fixedStepMs / 1000;
  state.projectiles = state.projectiles.filter((projectile) => {
    const length = Math.min(projectile.remaining, Math.hypot(projectile.vx, projectile.vy) * dt);
    const speed = Math.hypot(projectile.vx, projectile.vy);
    const target = {
      x: projectile.x + (projectile.vx / speed) * length,
      y: projectile.y + (projectile.vy / speed) * length,
    };
    if (!segmentClear(projectile, target, state.obstacles)) return false;
    projectile.x = target.x;
    projectile.y = target.y;
    projectile.remaining -= length;
    const hit = state.agents
      .filter(
        (agent) =>
          agent.alive &&
          agent.factionId === 'blue' &&
          Math.hypot(agent.x - projectile.x, agent.y - projectile.y) <= settings.cannonHitRadius,
      )
      .sort((a, b) => Number(a.id.slice(6)) - Number(b.id.slice(6)))[0];
    if (hit) {
      addDamage(hit.id, settings.cannonDamage);
      return false;
    }
    return (
      projectile.remaining > 0 &&
      projectile.x >= 0 &&
      projectile.x <= state.world.width &&
      projectile.y >= 0 &&
      projectile.y <= state.world.height
    );
  });
  if (damage.size) applyDamage(state, damage, config);
}
