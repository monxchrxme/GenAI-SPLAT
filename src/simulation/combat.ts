import type { AgentId, LevelConfig, MatchState } from '../core/types';

// All attacks use the same pre-damage state. Each attacker acts at most once per cooldown.
export function resolveCombat(state: MatchState, config: LevelConfig): void {
  const combat = config.combat;
  if (!combat) return;
  const alive = state.agents
    .filter((agent) => agent.alive)
    .sort((a, b) => Number(a.id.slice(6)) - Number(b.id.slice(6)));
  const damage = new Map<AgentId, number>();
  for (const attacker of alive) {
    if ((attacker.nextAttackTick ?? 0) > state.tick) continue;
    const target = alive
      .filter((candidate) => candidate.factionId !== attacker.factionId)
      .map((candidate) => ({
        candidate,
        distance: Math.hypot(candidate.x - attacker.x, candidate.y - attacker.y),
      }))
      .filter(
        (item) =>
          item.distance <=
          (attacker.variant === 'deviant'
            ? (config.deviant?.attackRange ?? combat.range)
            : combat.range),
      )
      .sort(
        (a, b) =>
          a.distance - b.distance ||
          Number(a.candidate.id.slice(6)) - Number(b.candidate.id.slice(6)),
      )[0]?.candidate;
    if (!target) continue;
    attacker.nextAttackTick =
      state.tick +
      (attacker.variant === 'deviant'
        ? (config.deviant?.attackCooldown ?? combat.cooldownTicks)
        : combat.cooldownTicks);
    damage.set(target.id, (damage.get(target.id) ?? 0) + combat.damage);
  }
  applyDamage(state, damage, config);
}

export function applyDamage(
  state: MatchState,
  damage: ReadonlyMap<AgentId, number>,
  config: LevelConfig,
): void {
  const alive = state.agents.filter((agent) => agent.alive);
  for (const agent of alive) {
    const amount = damage.get(agent.id);
    if (!amount) continue;
    agent.hp = Math.max(0, agent.hp - amount);
    agent.hitUntilTick = state.tick + (config.combat?.hitFeedbackTicks ?? 1);
    if (agent.hp === 0) {
      if (agent.factionId === 'red' && config.reinforcement) state.reinforcementCredits++;
      agent.alive = false;
      agent.vx = 0;
      agent.vy = 0;
    }
  }
  for (const group of state.groups) {
    const surviving = new Set(
      alive.filter((agent) => agent.alive && agent.groupId === group.id).map((agent) => agent.id),
    );
    group.agentIds = group.agentIds.filter((id) => surviving.has(id));
    if (group.formation) {
      group.formation.slots = group.formation.slots
        .filter((slot) => surviving.has(slot.agentId))
        .map((slot, index) => ({ ...slot, index }));
    }
  }
  state.groups = state.groups.filter((group) => group.agentIds.length > 0);
  if (state.selectedGroupId && !state.groups.some((group) => group.id === state.selectedGroupId))
    state.selectedGroupId = null;
  if (
    state.merge &&
    ![state.merge.first, state.merge.second].every((id) =>
      state.groups.some((group) => group.id === id),
    )
  )
    state.merge = null;
}
