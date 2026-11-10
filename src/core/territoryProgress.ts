// Display must never round a not-yet-reached win threshold up to its target.
export function territoryPercent(owned: number, accessible: number): number {
  return accessible > 0 ? Math.floor((100 * owned) / accessible) : 0;
}
