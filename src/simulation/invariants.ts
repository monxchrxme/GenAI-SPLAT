import type { AgentId, Snapshot } from '../core/types';

export function assertInvariants(state: Snapshot): void {
  const agents = new Map(state.agents.map((agent) => [agent.id, agent]));
  const groups = new Map(state.groups.map((group) => [group.id, group]));
  if (agents.size !== state.agents.length || groups.size !== state.groups.length) {
    throw new Error('Duplicate agent or group ID');
  }
  if (state.selectedGroupId !== null && !groups.has(state.selectedGroupId)) {
    throw new Error('Selected group does not exist');
  }
  const membership = new Set<AgentId>();
  for (const group of state.groups) {
    if (
      group.tensionUntilTick !== undefined &&
      (!group.formation ||
        !Number.isSafeInteger(group.tensionUntilTick) ||
        group.tensionUntilTick < 0)
    ) {
      throw new Error('Invalid tension signal');
    }
    if (group.formation) {
      const slots = group.formation.slots;
      if (
        slots.length !== group.agentIds.length ||
        new Set(slots.map((slot) => slot.agentId)).size !== slots.length ||
        slots.some(
          (slot, index) =>
            slot.index !== index ||
            !group.agentIds.includes(slot.agentId) ||
            !Number.isFinite(slot.x) ||
            !Number.isFinite(slot.y) ||
            slot.x < 0 ||
            slot.y < 0 ||
            slot.x > state.world.width ||
            slot.y > state.world.height,
        )
      )
        throw new Error('Invalid formation assignment');
    }
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
      !Number.isFinite(agent.vx) ||
      !Number.isFinite(agent.vy) ||
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
