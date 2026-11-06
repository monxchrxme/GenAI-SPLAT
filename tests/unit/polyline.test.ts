import { expect, it } from 'vitest';
import { PolylineDraft } from '../../src/core/polyline';
import { DRAWING } from '../../src/core/config';

it('ignores empty/short lines, duplicates, noise and non-finite samples', () => {
  const line = new PolylineDraft({ x: 0, y: 0 }, DRAWING);
  expect(line.valid).toBe(false);
  for (const x of [0, 1, 7, NaN, Infinity]) line.add({ x, y: 0 });
  expect(line.points).toHaveLength(1);
  line.add({ x: 8, y: 0 });
  expect(line.valid).toBe(false);
  line.add({ x: 24, y: 0 });
  expect(line.valid).toBe(true);
});
it('preserves a multi-corner line and owns detached copies', () => {
  const start = { x: 0, y: 0 };
  const line = new PolylineDraft(start, DRAWING);
  start.x = 999;
  const end = { x: 24, y: 24 };
  line.add({ x: 24, y: 0 });
  line.add(end);
  end.x = 999;
  expect(line.points).toEqual([
    { x: 0, y: 0 },
    { x: 24, y: 0 },
    { x: 24, y: 24 },
  ]);
  (line.points as { x: number; y: number }[])[0]!.x = 999;
  expect(line.points[0]?.x).toBe(0);
});
it('clips exactly at maximum arc length and freezes further sampling', () => {
  const line = new PolylineDraft({ x: 0, y: 0 }, { ...DRAWING, maxLength: 30 });
  line.add({ x: 24, y: 0 });
  line.add({ x: 24, y: 24 });
  expect(line.points.at(-1)).toEqual({ x: 24, y: 6 });
  expect(line.limited).toBe(true);
  line.add({ x: 100, y: 100 });
  expect(line.points).toHaveLength(3);
});
it('bounds the number of stored points', () => {
  const line = new PolylineDraft({ x: 0, y: 0 }, { ...DRAWING, maxPoints: 3 });
  for (let x = 8; x < 8000; x += 8) line.add({ x, y: 0 });
  expect(line.points).toHaveLength(3);
  expect(line.limited).toBe(true);
});
it('rejects invalid limits and invalid starts', () => {
  for (const maxPoints of [0, 1, 2.5, Infinity]) {
    expect(() => new PolylineDraft({ x: 0, y: 0 }, { ...DRAWING, maxPoints })).toThrow();
  }
  expect(() => new PolylineDraft({ x: NaN, y: 0 }, DRAWING)).toThrow();
});
