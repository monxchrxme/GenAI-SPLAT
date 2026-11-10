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
    !Number.isFinite(paint.ownerThreshold) ||
    paint.ownerThreshold <= 0 ||
    paint.ownerThreshold > 1
  )
    throw new Error('Invalid paint configuration');
}

// [P] Presence is binary per faction: concentration does not increase paint speed.
// Equal opposing presence cancels; unoccupied cells retain their control.
export function updatePaint(state: MatchState, config: LevelConfig): void {
  const { columns, rows, radius, ratePerSecond, ownerThreshold } = config.paint;
  const delta = (ratePerSecond * config.fixedStepMs) / 1000;
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
    cell.control = Math.max(-1, Math.min(1, cell.control + (Number(blue) - Number(red)) * delta));
    cell.owner =
      cell.control >= ownerThreshold ? 'blue' : cell.control <= -ownerThreshold ? 'red' : null;
  }
}
