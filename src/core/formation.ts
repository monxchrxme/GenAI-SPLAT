import { DRAWING } from './config';
import type { AgentId, Formation, Point } from './types';

// [P] Stable numeric Agent ID order along the drawn direction; positions do not affect assignment.
export function createFormation(
  points: readonly Point[],
  agentIds: readonly AgentId[],
): Formation | null {
  if (
    !agentIds.length ||
    new Set(agentIds).size !== agentIds.length ||
    points.length > DRAWING.maxPoints
  )
    return null;
  const path: Point[] = [];
  const distances = [0];
  let total = 0;
  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
    const last = path.at(-1);
    const length = last ? Math.hypot(point.x - last.x, point.y - last.y) : 0;
    if (last && length === 0) continue;
    if (last) {
      total += length;
      distances.push(total);
    }
    path.push({ ...point });
  }
  if (path.length < 2 || total < DRAWING.minLength || total > DRAWING.maxLength + 1e-7) return null;
  const ids = [...agentIds].sort((a, b) => Number(a.slice(6)) - Number(b.slice(6)));
  let segment = 1;
  const slots = ids.map((agentId, index) => {
    const distance = ids.length === 1 ? total / 2 : (total * index) / (ids.length - 1);
    while (segment < path.length - 1 && distances[segment]! < distance) segment++;
    const a = path[segment - 1]!;
    const b = path[segment]!;
    const fraction =
      (distance - distances[segment - 1]!) / (distances[segment]! - distances[segment - 1]!);
    return { agentId, index, x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction };
  });
  return { points: path, slots };
}
