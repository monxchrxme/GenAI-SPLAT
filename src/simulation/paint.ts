import type { LevelConfig, MatchState, PaintConfig } from '../core/types';

export function validatePaint(paint: PaintConfig): void {
  if (
    !Number.isSafeInteger(paint.columns) ||
    paint.columns < 1 ||
    !Number.isSafeInteger(paint.rows) ||
    paint.rows < 1 ||
    !Number.isFinite(paint.radius) ||
    paint.radius <= 0 ||
    !Number.isFinite(paint.ratePerSecond) ||
    paint.ratePerSecond <= 0 ||
    (paint.firstCaptureRatePerSecond !== undefined &&
      (!Number.isFinite(paint.firstCaptureRatePerSecond) ||
        paint.firstCaptureRatePerSecond <= 0)) ||
    !Number.isFinite(paint.ownerThreshold) ||
    paint.ownerThreshold <= 0 ||
    paint.ownerThreshold > 1
  )
    throw new Error('Invalid paint configuration');
}

// [P] Presence is binary per faction: concentration does not increase paint speed.
// Equal opposing presence cancels; unoccupied cells retain their control.
export function updatePaint(state: MatchState, config: LevelConfig): void {
  const { columns, rows, radius, ratePerSecond, firstCaptureRatePerSecond, ownerThreshold } =
    config.paint;
  const delta = (ratePerSecond * config.fixedStepMs) / 1000;
  const firstCaptureDelta =
    ((firstCaptureRatePerSecond ?? ratePerSecond) * config.fixedStepMs) / 1000;
  for (let index = 0; index < state.paintCells.length; index++) {
    if (state.paintCells[index]!.blocked) continue;
    const x = (((index % columns) + 0.5) * state.world.width) / columns;
    const y = ((Math.floor(index / columns) + 0.5) * state.world.height) / rows;
    let blue = false;
    let red = false;
    for (const agent of state.agents) {
      if (!agent.alive || (agent.x - x) ** 2 + (agent.y - y) ** 2 > radius ** 2) continue;
      if (agent.factionId === 'blue') blue = true;
      else red = true;
      if (blue && red) break;
    }
    const cell = state.paintCells[index]!;
    // A mine or the initial objective can assign ownership before painting runs.
    const wasOwned = cell.owner !== null || cell.hasBeenOwned;
    const step = wasOwned ? delta : firstCaptureDelta;
    cell.control = Math.max(-1, Math.min(1, cell.control + (Number(blue) - Number(red)) * step));
    cell.owner =
      cell.control >= ownerThreshold ? 'blue' : cell.control <= -ownerThreshold ? 'red' : null;
    if (firstCaptureRatePerSecond !== undefined && (wasOwned || cell.owner !== null))
      cell.hasBeenOwned = true;
  }
}
