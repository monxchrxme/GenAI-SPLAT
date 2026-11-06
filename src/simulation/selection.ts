import type { AgentId, GroupId, Point, SelectionConfig, Snapshot } from '../core/types';

export function pickGroupAtPoint(
  state: Snapshot,
  point: Point,
  config: SelectionConfig,
): GroupId | null {
  const selectableGroups = new Set(
    state.groups.filter((group) => group.factionId === 'blue').map((group) => group.id),
  );
  let nearest: { distance: number; agentId: AgentId; groupId: GroupId } | null = null;
  const agents = state.agents.filter(
    (agent) => agent.alive && agent.factionId === 'blue' && selectableGroups.has(agent.groupId),
  );
  for (const agent of agents) {
    const distance = (agent.x - point.x) ** 2 + (agent.y - point.y) ** 2;
    if (
      distance <= config.hitRadius ** 2 &&
      (nearest === null ||
        distance < nearest.distance ||
        (distance === nearest.distance && agent.id < nearest.agentId))
    ) {
      nearest = { distance, agentId: agent.id, groupId: agent.groupId };
    }
  }
  if (nearest) return nearest.groupId;

  // Only local gaps are selectable, never the whole bounding box / hull of a
  // scattered group. Agent order and stale formation targets cannot affect it.
  agents.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  let bridge: { distance: number; groupId: GroupId } | null = null;
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i]!;
    for (let j = i + 1; j < agents.length; j++) {
      const b = agents[j]!;
      if (a.groupId !== b.groupId) continue;
      const dx = b.x - a.x,
        dy = b.y - a.y;
      const lengthSquared = dx * dx + dy * dy;
      if (lengthSquared === 0 || lengthSquared > config.neighborDistance ** 2) continue;
      const t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared;
      if (t < 0 || t > 1) continue;
      const distance = (point.x - a.x - t * dx) ** 2 + (point.y - a.y - t * dy) ** 2;
      if (distance <= config.hitRadius ** 2 && (bridge === null || distance < bridge.distance))
        bridge = { distance, groupId: a.groupId };
    }
  }
  return bridge?.groupId ?? null;
}
