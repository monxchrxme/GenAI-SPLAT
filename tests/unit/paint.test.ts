import { describe, expect, it } from 'vitest';
import { S0_CLOCK, S0_LEVEL } from '../../src/core/config';
import { Session } from '../../src/app/session';
import { createInitialState } from '../../src/simulation/initialState';
import { updatePaint, validatePaint } from '../../src/simulation/paint';

const config = {
  ...S0_LEVEL,
  paint: { columns: 1, rows: 1, radius: 100, ratePerSecond: 1, ownerThreshold: 0.5 },
  fixedStepMs: 100,
};

describe('territory prototype', () => {
  it('claims at threshold, retains control without presence and repaints through neutral', () => {
    const state = createInitialState(config);
    const agent = state.agents[0]!;
    state.agents = [agent];
    agent.x = state.world.width / 2;
    agent.y = state.world.height / 2;
    for (let i = 0; i < 4; i++) updatePaint(state, config);
    expect(state.paintCells[0]!.owner).toBeNull();
    updatePaint(state, config);
    expect(state.paintCells[0]!.owner).toBe('blue');
    agent.alive = false;
    updatePaint(state, config);
    expect(state.paintCells[0]!.control).toBe(0.5);
    agent.alive = true;
    agent.factionId = 'red';
    updatePaint(state, config);
    expect(state.paintCells[0]!.owner).toBeNull();
    for (let i = 0; i < 10; i++) updatePaint(state, config);
    expect(state.paintCells[0]!.owner).toBe('red');
  });

  it('cancels opposing presence regardless of numbers and clamps control', () => {
    const state = createInitialState(config);
    for (const a of state.agents) {
      a.x = 800;
      a.y = 500;
    }
    state.agents[0]!.factionId = 'red';
    for (let i = 0; i < 20; i++) updatePaint(state, config);
    expect(state.paintCells[0]).toEqual({ control: 0, owner: null });
    state.agents[0]!.alive = false;
    for (let i = 0; i < 30; i++) updatePaint(state, config);
    expect(state.paintCells[0]).toEqual({ control: 1, owner: 'blue' });
  });

  it('is deterministic, snapshots are detached, and Restart clears paint', () => {
    const run = () => {
      const session = new Session(S0_LEVEL, S0_CLOCK);
      const initial = session.getSnapshot();
      for (let i = 0; i < 120; i++) session.advance(S0_CLOCK.stepMs);
      const painted = session.getSnapshot();
      expect(painted.paintCells.some((cell) => cell.owner === 'blue')).toBe(true);
      expect(initial.paintCells.every((cell) => cell.control === 0)).toBe(true);
      expect(Object.isFrozen(painted.paintCells[0])).toBe(true);
      session.submit('restart');
      expect(session.advance(0)).toEqual(initial);
      return painted;
    };
    expect(run()).toEqual(run());
  });

  it('rejects invalid paint parameters', () => {
    for (const paint of [
      { ...config.paint, columns: 0 },
      { ...config.paint, radius: NaN },
      { ...config.paint, ownerThreshold: 1.1 },
    ])
      expect(() => validatePaint(paint)).toThrow();
  });
});
