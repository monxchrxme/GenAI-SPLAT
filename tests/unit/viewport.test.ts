import { expect, it } from 'vitest';
import { S0_LEVEL } from '../../src/core/config';
import { PRESENTATION } from '../../src/rendering/presentation';
import { fitWorld } from '../../src/rendering/viewport';
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
