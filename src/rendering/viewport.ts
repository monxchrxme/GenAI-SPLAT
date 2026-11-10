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

export function fitCamera(
  width: number,
  height: number,
  world: Readonly<World>,
  padding: number,
  viewWidth: number,
  cameraLeft: number,
) {
  const frame = fitWorld(
    width,
    height,
    { width: Math.min(world.width, viewWidth), height: world.height },
    padding,
  );
  const left = Math.max(0, Math.min(Math.max(0, world.width - viewWidth), cameraLeft));
  return { ...frame, left, x: frame.x - left * frame.scale };
}

// Adjacent camera blocks overlap. The final block is clamped to the map edge.
export function nextCameraPage(
  current: number,
  direction: -1 | 1,
  worldWidth: number,
  viewWidth: number,
  step: number,
): number {
  const maxLeft = Math.max(0, worldWidth - viewWidth);
  const pages: number[] = [];
  for (let left = 0; left < maxLeft; left += step) pages.push(left);
  pages.push(maxLeft);
  if (direction > 0) return pages.find((left) => left > current + 0.001) ?? maxLeft;
  return pages.filter((left) => left < current - 0.001).at(-1) ?? 0;
}

export function pageCameraLeft(
  current: number,
  position: number,
  direction: -1 | 0 | 1,
  worldWidth: number,
  viewWidth: number,
  step: number,
  edgeFraction: number,
): number {
  if (direction > 0 && position >= current + viewWidth * (1 - edgeFraction))
    return nextCameraPage(current, 1, worldWidth, viewWidth, step);
  if (direction < 0 && position <= current + viewWidth * edgeFraction)
    return nextCameraPage(current, -1, worldWidth, viewWidth, step);
  return current;
}

// Smoothstep keeps both ends of a quick page change free of hard velocity jumps.
export function cameraTransition(start: number, end: number, progress: number): number {
  const t = Math.max(0, Math.min(1, progress));
  const eased = t * t * (3 - 2 * t);
  return start + (end - start) * eased;
}

// Client/CSS pixels -> logical viewport -> world. Backing-buffer/DPR pixels are never used.
export function clientToWorld(
  point: Point,
  bounds: CanvasBounds,
  viewport: ViewportSize,
  world: Readonly<World>,
  padding: number,
  viewWidth = world.width,
  cameraLeft = 0,
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
      viewWidth,
      cameraLeft,
    ].every(Number.isFinite) ||
    bounds.width <= 0 ||
    bounds.height <= 0 ||
    viewport.width <= 0 ||
    viewport.height <= 0 ||
    world.width <= 0 ||
    world.height <= 0 ||
    padding < 0 ||
    viewWidth <= 0
  )
    return null;
  const camera = fitCamera(viewport.width, viewport.height, world, padding, viewWidth, cameraLeft);
  const cameraY = (viewport.height - world.height * camera.scale) / 2;
  const localX = ((point.x - bounds.left) * viewport.width) / bounds.width;
  const localY = ((point.y - bounds.top) * viewport.height) / bounds.height;
  if (
    localX < camera.x ||
    localY < cameraY ||
    localX > camera.x + world.width * camera.scale ||
    localY > cameraY + world.height * camera.scale
  )
    return null;
  return { x: (localX - camera.x) / camera.scale, y: (localY - cameraY) / camera.scale };
}
