import type { MatchState } from '../core/types';

export function updateObjective(state: MatchState): void {
  if (!state.objective) return;
  const { area } = state.objective;
  const { columns, rows } = state.paintGrid;
  const cells = state.paintCells.filter((_, index) => {
    const x = (((index % columns) + 0.5) * state.world.width) / columns;
    const y = ((Math.floor(index / columns) + 0.5) * state.world.height) / rows;
    return x >= area.x && x < area.x + area.width && y >= area.y && y < area.y + area.height;
  });
  state.objective.captured =
    cells.length > 0 && cells.every((cell) => !cell.blocked && cell.owner === 'blue');
}
