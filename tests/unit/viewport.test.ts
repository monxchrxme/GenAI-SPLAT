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
