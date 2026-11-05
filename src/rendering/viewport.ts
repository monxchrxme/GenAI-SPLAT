import type { World } from '../core/types';

export function fitWorld(width: number, height: number, world: Readonly<World>, padding: number) {
  const scale = Math.min(
    Math.max(1, width - 2 * padding) / world.width,
    Math.max(1, height - 2 * padding) / world.height,
  );
  return {
    scale,
    x: (width - world.width * scale) / 2,
    y: (height - world.height * scale) / 2,
  };
}
