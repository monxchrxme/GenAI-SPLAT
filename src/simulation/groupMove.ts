import type { Formation, GroupId, Point, Snapshot } from '../core/types';
import { findRoute, pointBlocked, UNIT_CLEARANCE } from './obstacles';

// Preserve offsets when possible; move obstructed destinations to nearby reachable ground.
export function groupMoveFormation(
  state: Snapshot,
  groupId: GroupId,
  destination: Point,
): Formation | null {
  const group = state.groups.find((item) => item.id === groupId && item.factionId === 'blue');
  if (
    !group ||
    !Number.isFinite(destination.x) ||
    !Number.isFinite(destination.y) ||
    destination.x < 0 ||
    destination.x > state.world.width ||
    destination.y < 0 ||
    destination.y > state.world.height
  )
    return null;
  const members = group.agentIds.map((id) =>
    state.agents.find((agent) => agent.id === id && agent.alive),
  );
  if (!members.length || members.some((agent) => !agent)) return null;
  const center = {
    x: members.reduce((sum, agent) => sum + agent!.x, 0) / members.length,
    y: members.reduce((sum, agent) => sum + agent!.y, 0) / members.length,
  };
  const slots = members.map((agent, index) => ({
    agentId: agent!.id,
    index,
    x: agent!.x + destination.x - center.x,
    y: agent!.y + destination.y - center.y,
  }));
  const valid = (p: Point) =>
    p.x >= 0 &&
    p.y >= 0 &&
    p.x <= state.world.width &&
    p.y <= state.world.height &&
    !pointBlocked(p, state.obstacles, UNIT_CLEARANCE);
  for (const [index, slot] of slots.entries()) {
    if (valid(slot)) continue;
    const agent = members[index]!;
    const base = {
      x: Math.max(0, Math.min(state.world.width, slot.x)),
      y: Math.max(0, Math.min(state.world.height, slot.y)),
    };
    let found: Point | null = null;
    for (let distance = 0; distance <= 384 && !found; distance += 24) {
      for (const [dx, dy] of [
        [0, 0],
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ]) {
        const point = { x: base.x + dx! * distance, y: base.y + dy! * distance };
        if (
          valid(point) &&
          !slots
            .slice(0, index)
            .some((other) => Math.hypot(other.x - point.x, other.y - point.y) < UNIT_CLEARANCE) &&
          findRoute(agent!, point, state.world, state.obstacles)
        ) {
          found = point;
          break;
        }
      }
    }
    if (!found) return null;
    slot.x = found.x;
    slot.y = found.y;
  }
  // A free arrangement is represented by slots, not a fabricated drawn path.
  return { points: [], slots };
}
