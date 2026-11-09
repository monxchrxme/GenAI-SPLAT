import type { Formation, Point } from '../core/types';

// A cut must cross the commanded path once and pass between two assigned slots.
export function splitFormation(
  formation: Formation,
  cut: readonly Point[],
): [Formation, Formation] | null {
  if (
    formation.slots.length < 2 ||
    cut.length < 2 ||
    cut.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))
  )
    return null;
  const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x;
  const hits: { distance: number; point: Point; segment: number }[] = [];
  let distance = 0;
  for (let i = 1; i < formation.points.length; i++) {
    const a = formation.points[i - 1]!;
    const b = formation.points[i]!;
    const r = { x: b.x - a.x, y: b.y - a.y };
    const length = Math.hypot(r.x, r.y);
    for (let j = 1; j < cut.length; j++) {
      const c = cut[j - 1]!;
      const d = cut[j]!;
      const s = { x: d.x - c.x, y: d.y - c.y };
      const denominator = cross(r, s);
      if (Math.abs(denominator) < 1e-9) continue;
      const delta = { x: c.x - a.x, y: c.y - a.y };
      const t = cross(delta, s) / denominator;
      const u = cross(delta, r) / denominator;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        const at = distance + t * length;
        if (!hits.some((hit) => Math.abs(hit.distance - at) < 1e-6))
          hits.push({ distance: at, point: { x: a.x + t * r.x, y: a.y + t * r.y }, segment: i });
      }
    }
    distance += length;
  }
  if (hits.length !== 1 || distance === 0) return null;
  const hit = hits[0]!;
  // Existing slots retain their coordinates after a cut, so their spacing on
  // the shortened path must be measured rather than inferred from endpoints.
  const slotDistances = formation.slots.map((slot) => {
    let walked = 0;
    let bestDistance = Infinity;
    let along = 0;
    for (let i = 1; i < formation.points.length; i++) {
      const a = formation.points[i - 1]!;
      const b = formation.points[i]!;
      const dx = b.x - a.x,
        dy = b.y - a.y;
      const length = Math.hypot(dx, dy);
      if (length === 0) continue;
      const t = Math.max(
        0,
        Math.min(1, ((slot.x - a.x) * dx + (slot.y - a.y) * dy) / (length * length)),
      );
      const error = Math.hypot(slot.x - a.x - t * dx, slot.y - a.y - t * dy);
      if (error < bestDistance) {
        bestDistance = error;
        along = walked + t * length;
      }
      walked += length;
    }
    return along;
  });
  if (slotDistances.some((d) => Math.abs(d - hit.distance) < 1e-7)) return null;
  const count = slotDistances.filter((d) => d < hit.distance).length;
  if (
    count === 0 ||
    count === formation.slots.length ||
    slotDistances.slice(count).some((d) => d < hit.distance)
  )
    return null;
  const slots = (start: number, end: number) =>
    formation.slots.slice(start, end).map((slot, index) => ({ ...slot, index }));
  return [
    { points: [...formation.points.slice(0, hit.segment), hit.point], slots: slots(0, count) },
    {
      points: [hit.point, ...formation.points.slice(hit.segment)],
      slots: slots(count, formation.slots.length),
    },
  ];
}
