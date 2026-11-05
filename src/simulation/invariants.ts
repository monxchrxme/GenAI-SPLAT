import type { AgentId, Snapshot } from '../core/types';

export function assertInvariants(state: Snapshot): void {
  const agents = new Map(state.agents.map((agent) => [agent.id, agent]));
  const groups = new Map(state.groups.map((group) => [group.id, group]));
  if (agents.size !== state.agents.length || groups.size !== state.groups.length) {
    throw new Error('Duplicate agent or group ID');
  }
  const membership = new Set<AgentId>();
  for (const group of state.groups) {
    if (group.agentIds.length === 0) throw new Error('Empty group');
    for (const id of group.agentIds) {
      const agent = agents.get(id);
      if (
        !agent?.alive ||
        agent.groupId !== group.id ||
        agent.factionId !== group.factionId ||
        membership.has(id)
      ) {
        throw new Error('Invalid group membership');
      }
      membership.add(id);
    }
  }
  for (const agent of state.agents) {
    if (agent.alive && (!membership.has(agent.id) || !groups.has(agent.groupId))) {
      throw new Error('Live agent missing from its group');
    }
    if (
      !Number.isFinite(agent.x) ||
      !Number.isFinite(agent.y) ||
      agent.x < 0 ||
      agent.x > state.world.width ||
      agent.y < 0 ||
      agent.y > state.world.height
    ) {
      throw new Error('Agent outside world');
    }
  }
}
