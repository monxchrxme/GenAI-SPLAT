import type { MatchState, Obstacle } from '../core/types';

export function objectiveContains(area: Obstacle, x: number, y: number): boolean {
  return x >= area.x && x < area.x + area.width && y >= area.y && y < area.y + area.height;
}

export function objectiveCells(state: MatchState, area: Obstacle) {
  const { columns, rows } = state.paintGrid;
  return state.paintCells.filter((_, index) => {
    const x = (((index % columns) + 0.5) * state.world.width) / columns;
    const y = ((Math.floor(index / columns) + 0.5) * state.world.height) / rows;
    return objectiveContains(area, x, y);
  });
}

function isCaptured(state: MatchState, area: Obstacle): boolean {
  const cells = objectiveCells(state, area);
  return cells.length > 0 && cells.every((cell) => !cell.blocked && cell.owner === 'blue');
}

export function updateObjective(state: MatchState): void {
  // The checkpoint marks progress for the rest of this match; the final point can be lost.
  if (state.checkpoint && !state.checkpoint.captured)
    state.checkpoint.captured = isCaptured(state, state.checkpoint.area);
  if (state.objective) state.objective.captured = isCaptured(state, state.objective.area);
}
