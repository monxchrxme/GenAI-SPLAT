import type { DeepReadonly, MatchState, Snapshot } from '../core/types';

function freezeTree<T extends object>(value: T): DeepReadonly<T> {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') freezeTree(child);
  }
  return Object.freeze(value) as DeepReadonly<T>;
}

export function createSnapshot(state: MatchState): Snapshot {
  return freezeTree({
    ...state,
    world: { ...state.world },
    agents: state.agents.map((agent) => ({ ...agent })),
    groups: state.groups.map((group) => ({ ...group, agentIds: [...group.agentIds] })),
  });
}
