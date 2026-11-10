import type { Obstacle, Point, World } from '../core/types';

// [P] Unit clearance around solid, axis-aligned map geometry.
export const UNIT_CLEARANCE = 12;

export function pointBlocked(point: Point, obstacles: readonly Obstacle[], clearance = 0): boolean {
  return obstacles.some(
    (r) =>
      point.x >= r.x - clearance &&
      point.x <= r.x + r.width + clearance &&
      point.y >= r.y - clearance &&
      point.y <= r.y + r.height + clearance,
  );
}

export function segmentClear(
  a: Point,
  b: Point,
  obstacles: readonly Obstacle[],
  clearance = 0,
): boolean {
  return obstacles.every((r) => {
    const minX = r.x - clearance,
      maxX = r.x + r.width + clearance;
    const minY = r.y - clearance,
      maxY = r.y + r.height + clearance;
    let enter = 0,
      exit = 1;
    for (const [p, delta, low, high] of [
      [a.x, b.x - a.x, minX, maxX],
      [a.y, b.y - a.y, minY, maxY],
    ] as const) {
      if (delta === 0) {
        if (p < low || p > high) return true;
        continue;
      }
      const t1 = (low - p) / delta,
        t2 = (high - p) / delta;
      enter = Math.max(enter, Math.min(t1, t2));
      exit = Math.min(exit, Math.max(t1, t2));
      if (enter > exit) return true;
    }
    return false;
  });
}

// Visibility graph around the small authored obstacle set; deterministic tie order.
export function findRoute(
  start: Point,
  target: Point,
  world: Readonly<World>,
  obstacles: readonly Obstacle[],
): Point[] | null {
  if (
    pointBlocked(start, obstacles, UNIT_CLEARANCE) ||
    pointBlocked(target, obstacles, UNIT_CLEARANCE)
  )
    return null;
  if (segmentClear(start, target, obstacles, UNIT_CLEARANCE)) return [target];
  const offset = UNIT_CLEARANCE + 1;
  const corners = obstacles
    .flatMap((r) => [
      { x: r.x - offset, y: r.y - offset },
      { x: r.x + r.width + offset, y: r.y - offset },
      { x: r.x - offset, y: r.y + r.height + offset },
      { x: r.x + r.width + offset, y: r.y + r.height + offset },
    ])
    .filter(
      (p) =>
        p.x >= 0 &&
        p.x <= world.width &&
        p.y >= 0 &&
        p.y <= world.height &&
        !pointBlocked(p, obstacles, UNIT_CLEARANCE),
    );
  const nodes = [start, target, ...corners];
  const distances = nodes.map(() => Infinity),
    previous = nodes.map(() => -1),
    visited = nodes.map(() => false);
  distances[0] = 0;
  for (let i = 0; i < nodes.length; i++) {
    let current = -1;
    for (let j = 0; j < nodes.length; j++)
      if (!visited[j] && (current < 0 || distances[j]! < distances[current]!)) current = j;
    if (current < 0 || !Number.isFinite(distances[current]!)) break;
    if (current === 1) break;
    visited[current] = true;
    for (let j = 0; j < nodes.length; j++) {
      if (
        visited[j] ||
        j === current ||
        !segmentClear(nodes[current]!, nodes[j]!, obstacles, UNIT_CLEARANCE)
      )
        continue;
      const next =
        distances[current]! +
        Math.hypot(nodes[j]!.x - nodes[current]!.x, nodes[j]!.y - nodes[current]!.y);
      if (next < distances[j]!) {
        distances[j] = next;
        previous[j] = current;
      }
    }
  }
  if (!Number.isFinite(distances[1]!)) return null;
  const route: Point[] = [];
  for (let node = 1; node !== 0; node = previous[node]!) {
    if (node < 0) return null;
    route.unshift(nodes[node]!);
  }
  return route;
}
