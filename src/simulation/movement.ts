import type { LevelConfig, MatchState } from '../core/types';

export function validateMovement(config: LevelConfig): void {
  const m = config.movement;
  if (
    !Object.values(m).every(Number.isFinite) ||
    m.maxSpeed <= 0 ||
    m.arrivalGain <= 0 ||
    m.settleDistance <= 0 ||
    m.separationRadius <= 0 ||
    m.separationStrength < 0 ||
    m.separationStrength >= 1
  )
    throw new Error('Invalid movement configuration');
}

export function moveAgents(state: MatchState, config: LevelConfig): void {
  const m = config.movement;
  const dt = config.fixedStepMs / 1000;
  // Read old positions for every pair. Apply all changes together, in stable ID order.
  const ordered = state.agents
    .filter((a) => a.alive)
    .sort((a, b) => Number(a.id.slice(6)) - Number(b.id.slice(6)));
  const targets = new Map(
    state.groups.flatMap(
      (g) => g.formation?.slots.map((slot) => [slot.agentId, slot] as const) ?? [],
    ),
  );
  const updates = ordered.map((agent) => {
    const target = targets.get(agent.id);
    if (!target) return { agent, x: agent.x, y: agent.y, vx: 0, vy: 0 };
    const dx = target.x - agent.x,
      dy = target.y - agent.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= Math.min(m.settleDistance, m.maxSpeed * dt)) {
      return { agent, x: target.x, y: target.y, vx: 0, vy: 0 };
    }
    const speed = Math.min(m.maxSpeed, distance * m.arrivalGain);
    let sx = 0,
      sy = 0;
    for (const other of ordered) {
      if (other.id === agent.id || other.groupId !== agent.groupId) continue;
      const ox = agent.x - other.x,
        oy = agent.y - other.y;
      const gap = Math.hypot(ox, oy);
      if (gap >= m.separationRadius) continue;
      if (gap === 0) sx += Number(agent.id.slice(6)) < Number(other.id.slice(6)) ? -1 : 1;
      else {
        const weight = 1 - gap / m.separationRadius;
        sx += (ox / gap) * weight;
        sy += (oy / gap) * weight;
      }
    }
    const separation = Math.hypot(sx, sy);
    // Separation cannot reverse progress and fades near the assigned slot.
    const gain =
      (speed * m.separationStrength * Math.min(1, distance / m.separationRadius)) /
      Math.max(1, separation);
    let vx = (dx / distance) * speed + sx * gain,
      vy = (dy / distance) * speed + sy * gain;
    const magnitude = Math.hypot(vx, vy);
    const scale = Math.min(1, m.maxSpeed / magnitude, distance / (magnitude * dt));
    vx *= scale;
    vy *= scale;
    const x = Math.max(0, Math.min(state.world.width, agent.x + vx * dt));
    const y = Math.max(0, Math.min(state.world.height, agent.y + vy * dt));
    return { agent, x, y, vx: (x - agent.x) / dt, vy: (y - agent.y) / dt };
  });
  for (const { agent, x, y, vx, vy } of updates) Object.assign(agent, { x, y, vx, vy });
}
