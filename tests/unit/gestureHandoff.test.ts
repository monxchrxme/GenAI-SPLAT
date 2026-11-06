import { afterEach, expect, it, vi } from 'vitest';
import { Session } from '../../src/app/session';
import { S0_CLOCK, S0_LEVEL } from '../../src/core/config';
import { bindGroupSelectionInput } from '../../src/input/groupSelectionInput';
import type { Point } from '../../src/core/types';

afterEach(() => vi.unstubAllGlobals());

function setup() {
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', new EventTarget());
  class Canvas extends EventTarget {
    capture: number | null = null;
    setPointerCapture(id: number) {
      this.capture = id;
    }
    hasPointerCapture(id: number) {
      return this.capture === id;
    }
    releasePointerCapture() {
      this.capture = null;
    }
  }
  const canvas = new Canvas();
  const session = new Session(S0_LEVEL, S0_CLOCK);
  session.submit({ type: 'select-group-id', groupId: 'group-1' });
  session.advance(S0_CLOCK.stepMs);
  const input = bindGroupSelectionInput(
    canvas as unknown as HTMLCanvasElement,
    (p) => p,
    (intent) => session.submit(intent),
    () => session.getSnapshot(),
  );
  const event = (type: string, p: Point, samples: readonly Point[] = []) => {
    canvas.dispatchEvent(
      Object.assign(new Event(type), {
        button: 0,
        isPrimary: true,
        pointerId: 1,
        clientX: p.x,
        clientY: p.y,
        getCoalescedEvents: () => samples.map((s) => ({ clientX: s.x, clientY: s.y })),
      }),
    );
  };
  const draw = (a: Point, b: Point) => {
    event('pointerdown', a);
    event('pointermove', b);
    event('pointerup', b);
  };
  return { session, input, event, draw, canvas };
}

it('keeps each released replacement visible through render-only frames until the fixed tick', () => {
  const { session, input, draw } = setup();
  draw({ x: 800, y: 200 }, { x: 1400, y: 200 });
  session.advance(S0_CLOCK.stepMs);
  for (let i = 0; i < 12; i++) {
    const points =
      i % 2
        ? [
            { x: 1400, y: 850 },
            { x: 800, y: 850 },
          ]
        : [
            { x: 800, y: 150 },
            { x: 1400, y: 150 },
          ];
    draw(points[0]!, points[1]!);
    // 240 Hz can render several frames before the next 60 Hz simulation step.
    for (let frame = 0; frame < 3; frame++) {
      expect(input.preview().points).toEqual(points);
      session.advance(S0_CLOCK.stepMs / 4);
    }
    session.advance(S0_CLOCK.stepMs / 4);
    expect(session.getSnapshot().groups[0]?.formation?.points).toEqual(points);
    expect(input.preview().points).toEqual(points);
  }
  input.dispose();
});

it.each(['escape', 'blur', 'hidden', 'pointercancel', 'lostcapture'] as const)(
  'QA-07: %s cancels only the current draft; the previous order and the next gesture survive',
  (reason) => {
    const { session, input, event, draw, canvas } = setup();
    const a = { x: 800, y: 200 },
      b = { x: 1400, y: 200 };
    draw(a, b);
    session.advance(S0_CLOCK.stepMs);
    const saved = session.getSnapshot().groups[0]!.formation!;
    event('pointerdown', { x: 800, y: 800 });
    event('pointermove', { x: 1400, y: 800 });
    expect(input.preview().active).toBe(true);
    if (reason === 'escape')
      window.dispatchEvent(Object.assign(new Event('keydown'), { key: 'Escape' }));
    if (reason === 'blur') window.dispatchEvent(new Event('blur'));
    if (reason === 'hidden') {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    }
    if (reason === 'pointercancel') event('pointercancel', b);
    if (reason === 'lostcapture') {
      canvas.releasePointerCapture();
      event('lostpointercapture', b);
    }
    event('pointerup', { x: 1400, y: 800 });
    expect(input.preview().active).toBe(false);
    expect(input.preview().points).toEqual(saved.points);
    expect(session.advance(S0_CLOCK.stepMs).groups[0]!.formation).toEqual(saved);
    draw(b, a);
    expect(session.advance(S0_CLOCK.stepMs).groups[0]!.formation!.points).toEqual([b, a]);
    input.dispose();
  },
);

it('QA-07: a late lostcapture and another pointer cannot interrupt a newly captured gesture', () => {
  const { session, input, event, draw, canvas } = setup();
  draw({ x: 800, y: 200 }, { x: 1400, y: 200 });
  event('pointerdown', { x: 1400, y: 800 });
  event('pointermove', { x: 800, y: 800 });
  event('lostpointercapture', { x: 800, y: 800 });
  canvas.dispatchEvent(Object.assign(new Event('pointercancel'), { pointerId: 2 }));
  expect(input.preview().active).toBe(true);
  event('pointerup', { x: 800, y: 800 });
  expect(session.advance(S0_CLOCK.stepMs).groups[0]!.formation!.points).toEqual([
    { x: 1400, y: 800 },
    { x: 800, y: 800 },
  ]);
  input.dispose();
});

it('preserves the curved path of a quick out-and-back gesture from coalesced samples', () => {
  for (const offset of [0, 8]) {
    const { session, input, event, draw } = setup();
    draw({ x: 800, y: 200 }, { x: 1400, y: 200 });
    session.advance(S0_CLOCK.stepMs);
    const a = { x: 900, y: 700 },
      b = { x: 1300, y: 700 },
      end = { x: a.x + offset, y: a.y };
    event('pointerdown', a);
    if (offset) event('pointermove', end);
    event('pointermove', end, [b, end]);
    event('pointerup', end);
    session.advance(S0_CLOCK.stepMs);
    // Without coalesced samples: offset 0 becomes a clearing click, offset 8
    // looks too short to commit and leaves agents following their old target.
    expect(session.getSnapshot().groups[0]?.formation?.points).toEqual([
      a,
      ...(offset ? [end] : []),
      b,
      end,
    ]);
    input.dispose();
  }
});

it('last order wins before acknowledgement; cancelling another draft keeps it, clearing removes it', () => {
  const { session, input, draw, event } = setup();
  draw({ x: 800, y: 200 }, { x: 1400, y: 200 });
  draw({ x: 1400, y: 850 }, { x: 800, y: 850 });
  const last = input.preview().points;
  event('pointerdown', { x: 700, y: 300 });
  event('pointermove', { x: 900, y: 300 });
  input.cancel();
  expect(input.preview().points).toEqual(last);
  session.advance(S0_CLOCK.stepMs);
  expect(session.getSnapshot().groups[0]?.formation?.points).toEqual(last);
  event('pointerdown', { x: 1550, y: 950 });
  event('pointerup', { x: 1550, y: 950 });
  expect(input.preview().points).toEqual([]);
  session.advance(S0_CLOCK.stepMs);
  expect(session.getSnapshot().groups[0]?.formation).toBeUndefined();
  input.reset();
  expect(input.preview().pending).toBe(false);
  input.dispose();
});
