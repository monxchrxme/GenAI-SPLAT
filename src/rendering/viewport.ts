import type { Point, World } from '../core/types';

interface ViewportSize {
  readonly width: number;
  readonly height: number;
}

interface CanvasBounds extends ViewportSize {
  readonly left: number;
  readonly top: number;
}

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

// Client/CSS pixels -> logical viewport -> world. Backing-buffer/DPR pixels are never used.
export function clientToWorld(
  point: Point,
  bounds: CanvasBounds,
  viewport: ViewportSize,
  world: Readonly<World>,
  padding: number,
): Point | null {
  if (
    ![
      point.x,
      point.y,
      bounds.left,
      bounds.top,
      bounds.width,
      bounds.height,
      viewport.width,
      viewport.height,
      world.width,
      world.height,
      padding,
    ].every(Number.isFinite) ||
    bounds.width <= 0 ||
    bounds.height <= 0 ||
    viewport.width <= 0 ||
    viewport.height <= 0 ||
    world.width <= 0 ||
    world.height <= 0 ||
    padding < 0
  )
    return null;
  const camera = fitWorld(viewport.width, viewport.height, world, padding);
  const localX = ((point.x - bounds.left) * viewport.width) / bounds.width;
  const localY = ((point.y - bounds.top) * viewport.height) / bounds.height;
  if (
    localX < camera.x ||
    localY < camera.y ||
    localX > camera.x + world.width * camera.scale ||
    localY > camera.y + world.height * camera.scale
  )
    return null;
  return { x: (localX - camera.x) / camera.scale, y: (localY - camera.y) / camera.scale };
}
