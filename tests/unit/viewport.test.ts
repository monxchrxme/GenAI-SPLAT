import { expect, it } from 'vitest';
import { S0_LEVEL } from '../../src/core/config';
import { PRESENTATION } from '../../src/rendering/presentation';
import { clientToWorld, fitWorld } from '../../src/rendering/viewport';
import { createInitialState } from '../../src/simulation/initialState';

it.each([
  [1440, 760],
  [900, 520],
  [1920, 960],
  [390, 600],
])(
  'fits the complete unchanged world and all 40 markers in %dx%d with uniform scale',
  (width, height) => {
    const state = createInitialState(S0_LEVEL);
    const camera = fitWorld(width, height, state.world, PRESENTATION.padding);
    expect(camera.x).toBeGreaterThanOrEqual(0);
    expect(camera.y).toBeGreaterThanOrEqual(0);
    expect(camera.x + state.world.width * camera.scale).toBeLessThanOrEqual(width);
    expect(camera.y + state.world.height * camera.scale).toBeLessThanOrEqual(height);
    for (const agent of state.agents) {
      const radius = PRESENTATION.markerRadius * camera.scale;
      const x = camera.x + agent.x * camera.scale;
      const y = camera.y + agent.y * camera.scale;
      expect(x - radius).toBeGreaterThan(0);
      expect(y - radius).toBeGreaterThan(0);
      expect(x + radius).toBeLessThan(width);
      expect(y + radius).toBeLessThan(height);
    }
    expect(state.world).toEqual({ width: 1600, height: 1000 });
  },
);

it.each([
  [1440, 760, 1],
  [900, 520, 1],
  [1920, 960, 0.75],
  [390, 600, 2],
])('maps client points through viewport %dx%d and CSS scale %s', (width, height, cssScale) => {
  const viewport = { width, height };
  const bounds = { left: 67, top: 93, width: width * cssScale, height: height * cssScale };
  const camera = fitWorld(width, height, S0_LEVEL.world, PRESENTATION.padding);
  for (const expected of [
    { x: 430, y: 500 },
    { x: 1300, y: 800 },
  ]) {
    const client = {
      x: bounds.left + (camera.x + expected.x * camera.scale) * cssScale,
      y: bounds.top + (camera.y + expected.y * camera.scale) * cssScale,
    };
    const result = clientToWorld(client, bounds, viewport, S0_LEVEL.world, PRESENTATION.padding);
    expect(result?.x).toBeCloseTo(expected.x, 10);
    expect(result?.y).toBeCloseTo(expected.y, 10);
  }
  expect(
    clientToWorld(
      { x: bounds.left + 1, y: bounds.top + 1 },
      bounds,
      viewport,
      S0_LEVEL.world,
      PRESENTATION.padding,
    ),
  ).toBeNull();
});

it('maps exact world edges and rejects invalid rectangles, points and dimensions', () => {
  const viewport = { width: 1648, height: 1048 };
  const bounds = { left: 20, top: 90, ...viewport };
  expect(clientToWorld({ x: 44, y: 114 }, bounds, viewport, S0_LEVEL.world, 24)).toEqual({
    x: 0,
    y: 0,
  });
  expect(clientToWorld({ x: 1644, y: 1114 }, bounds, viewport, S0_LEVEL.world, 24)).toEqual({
    x: 1600,
    y: 1000,
  });
  for (const invalid of [NaN, Infinity, -Infinity]) {
    expect(clientToWorld({ x: invalid, y: 100 }, bounds, viewport, S0_LEVEL.world, 24)).toBeNull();
  }
  for (const width of [0, -1, NaN]) {
    expect(
      clientToWorld({ x: 44, y: 114 }, { ...bounds, width }, viewport, S0_LEVEL.world, 24),
    ).toBeNull();
    expect(
      clientToWorld({ x: 44, y: 114 }, bounds, { ...viewport, width }, S0_LEVEL.world, 24),
    ).toBeNull();
  }
});

it('maps world coordinates with a scrolled camera and clamps at map edges', async () => {
  const { fitCamera } = await import('../../src/rendering/viewport');
  const world = { width: 3200, height: 1000 };
  const viewport = { width: 1440, height: 760 };
  const bounds = { left: 30, top: 50, ...viewport };
  const camera = fitCamera(viewport.width, viewport.height, world, 24, 1600, 900);
  const expected = { x: 2000, y: 500 };
  const client = {
    x: bounds.left + camera.x + expected.x * camera.scale,
    y: bounds.top + camera.y + expected.y * camera.scale,
  };
  const result = clientToWorld(client, bounds, viewport, world, 24, 1600, 900);
  expect(result?.x).toBeCloseTo(expected.x, 8);
  expect(result?.y).toBeCloseTo(expected.y, 8);
  expect(fitCamera(viewport.width, viewport.height, world, 24, 1600, -50).left).toBe(0);
  expect(fitCamera(viewport.width, viewport.height, world, 24, 1600, 9000).left).toBe(1600);
});

it('switches between overlapping pages only at the directional edge', async () => {
  const { pageCameraLeft, nextCameraPage } = await import('../../src/rendering/viewport');
  expect(pageCameraLeft(0, 1279, 1, 3200, 1600, 800, 0.2)).toBe(0);
  expect(pageCameraLeft(0, 1280, 1, 3200, 1600, 800, 0.2)).toBe(800);
  expect(pageCameraLeft(800, 1500, 1, 3200, 1600, 800, 0.2)).toBe(800);
  expect(pageCameraLeft(800, 2080, 1, 3200, 1600, 800, 0.2)).toBe(1600);
  expect(pageCameraLeft(1600, 2880, 1, 3200, 1600, 800, 0.2)).toBe(1600);
  expect(pageCameraLeft(800, 1120, -1, 3200, 1600, 800, 0.2)).toBe(0);
  expect(nextCameraPage(1600, -1, 3200, 1600, 800)).toBe(800);
  expect(nextCameraPage(0, -1, 3200, 1600, 800)).toBe(0);
});

it('interpolates a page change smoothly and clamps its endpoints', async () => {
  const { cameraTransition } = await import('../../src/rendering/viewport');
  expect(cameraTransition(0, 800, -1)).toBe(0);
  expect(cameraTransition(0, 800, 0.25)).toBe(125);
  expect(cameraTransition(0, 800, 0.5)).toBe(400);
  expect(cameraTransition(0, 800, 1)).toBe(800);
  expect(cameraTransition(0, 800, 2)).toBe(800);
});

it('keeps the current page as the group reverses in the shared combat area', async () => {
  const { pageCameraLeft } = await import('../../src/rendering/viewport');
  const page = (left: number, center: number, direction: -1 | 1) =>
    pageCameraLeft(
      left,
      center,
      direction,
      6000,
      PRESENTATION.cameraViewWidth,
      PRESENTATION.cameraPageStep,
      PRESENTATION.cameraEdgeFraction,
    );
  expect(page(0, 1360, 1)).toBe(800);
  expect(page(800, 1100, -1)).toBe(800);
  expect(page(800, 1320, 1)).toBe(800);
  expect(page(800, 1040, -1)).toBe(0);
  expect(page(4000, 5360, 1)).toBe(4400);
  expect(page(4400, 5000, -1)).toBe(4400);
});
