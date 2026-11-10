import { expect, it } from 'vitest';
import { territoryPercent } from '../../src/core/territoryProgress';

it('never displays 60% before 60% of the actual playable cells are owned', () => {
  expect(territoryPercent(236, 394)).toBe(59);
  expect(territoryPercent(237, 394)).toBe(60);
  expect(territoryPercent(0, 394)).toBe(0);
  expect(territoryPercent(0, 0)).toBe(0);
});
