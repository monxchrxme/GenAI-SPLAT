import type { DeepReadonly, Formation, Group, TensionConfig } from './types';

export function validateTension(config: TensionConfig): void {
  if (
    !Number.isFinite(config.neighborGap) ||
    config.neighborGap <= 0 ||
    !Number.isSafeInteger(config.durationTicks) ||
    config.durationTicks < 1
  ) {
    throw new Error('Invalid tension configuration');
  }
}

export function isStretched(formation: DeepReadonly<Formation>, config: TensionConfig): boolean {
  return formation.slots.some((slot, index, slots) => {
    const previous = slots[index - 1];
    return (
      previous !== undefined &&
      Math.hypot(slot.x - previous.x, slot.y - previous.y) > config.neighborGap
    );
  });
}

export function tensionActive(group: DeepReadonly<Group> | undefined, tick: number): boolean {
  return (
    group?.formation !== undefined &&
    group.tensionUntilTick !== undefined &&
    tick < group.tensionUntilTick
  );
}
