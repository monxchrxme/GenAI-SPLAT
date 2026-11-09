import type { AgentId, GroupId, MatchState, Point } from '../core/types';

export function startMerge(state: MatchState, firstId: GroupId, secondId: GroupId): void {
  if (state.merge || state.selectedGroupId !== firstId || firstId === secondId) return;
  const first = state.groups.find((group) => group.id === firstId);
  const second = state.groups.find((group) => group.id === secondId);
  if (
    !first ||
    !second ||
    first.factionId !== 'blue' ||
    second.factionId !== first.factionId ||
    !first.agentIds.length ||
    !second.agentIds.length
  )
    return;
  delete first.formation;
  delete second.formation;
  delete first.tensionUntilTick;
  delete second.tensionUntilTick;
  state.merge = { first: firstId, second: secondId };
}

export function advanceMerge(
  state: MatchState,
  mergeDistance: number,
  highlightTicks: number,
): Map<AgentId, Point> {
  const targets = new Map<AgentId, Point>();
  if (!state.merge) return targets;
  const first = state.groups.find((g) => g.id === state.merge!.first);
  const second = state.groups.find((g) => g.id === state.merge!.second);
  if (
    !first ||
    !second ||
    first.factionId !== second.factionId ||
    !first.agentIds.length ||
    !second.agentIds.length
  ) {
    state.merge = null;
    return targets;
  }
  const firstAgents = state.agents.filter(
    (a) => a.alive && a.groupId === first.id && first.agentIds.includes(a.id),
  );
  const secondAgents = state.agents.filter(
    (a) => a.alive && a.groupId === second.id && second.agentIds.includes(a.id),
  );
  if (!firstAgents.length || !secondAgents.length) {
    state.merge = null;
    return targets;
  }
  const center = (agents: typeof firstAgents) => ({
    x: agents.reduce((sum, a) => sum + a.x, 0) / agents.length,
    y: agents.reduce((sum, a) => sum + a.y, 0) / agents.length,
  });
  const a = center(firstAgents),
    b = center(secondAgents);
  if (Math.hypot(a.x - b.x, a.y - b.y) <= mergeDistance) {
    first.mergeHighlightUntilTick = state.tick + highlightTicks;
    first.agentIds.push(...second.agentIds);
    for (const agent of secondAgents) agent.groupId = first.id;
    state.groups.splice(state.groups.indexOf(second), 1);
    if (state.selectedGroupId === second.id) state.selectedGroupId = first.id;
    state.merge = null;
    return targets;
  }
  const dx = (b.x - a.x) / 2,
    dy = (b.y - a.y) / 2;
  for (const agent of firstAgents)
    targets.set(agent.id, {
      x: Math.max(0, Math.min(state.world.width, agent.x + dx)),
      y: Math.max(0, Math.min(state.world.height, agent.y + dy)),
    });
  for (const agent of secondAgents)
    targets.set(agent.id, {
      x: Math.max(0, Math.min(state.world.width, agent.x - dx)),
      y: Math.max(0, Math.min(state.world.height, agent.y - dy)),
    });
  return targets;
}
