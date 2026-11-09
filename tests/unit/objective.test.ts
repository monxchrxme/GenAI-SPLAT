import { describe, expect, it } from 'vitest';
import { Session } from '../../src/app/session';
import { S0_CLOCK, S0_LEVEL } from '../../src/core/config';
import { Simulation } from '../../src/simulation/simulation';
import type { GameCommand } from '../../src/core/types';

const quickLevel = {
  ...S0_LEVEL,
  paint: { ...S0_LEVEL.paint, columns: 1, rows: 1, radius: 2000 },
  victoryFraction: 1,
};

describe('territory objective', () => {
  it('finishes once at the ownership threshold, freezes state and restarts cleanly', () => {
    const session = new Session(quickLevel, S0_CLOCK);
    const initial = session.getSnapshot();
    for (let i = 0; i < 150; i++) session.advance(S0_CLOCK.stepMs);
    const won = session.getSnapshot();
    expect(won.phase).toBe('finished');
    expect(won.result).toBe('victory');
    session.submit({ type: 'select-group-id', groupId: 'group-1' });
    for (let i = 0; i < 30; i++) session.advance(S0_CLOCK.stepMs);
    expect(session.getSnapshot()).toEqual(won);
    session.submit('restart');
    expect(session.advance(0)).toEqual(initial);
    expect(session.commandLog).toEqual([]);
  });

  it('replays the same seed and commands with identical territory and outcome', () => {
    const commands: GameCommand[] = [
      { tick: 0, type: 'select-group-id', groupId: 'group-1' },
      {
        tick: 1,
        type: 'set-formation',
        groupId: 'group-1',
        points: [
          { x: 300, y: 200 },
          { x: 1000, y: 200 },
        ],
      },
    ];
    const run = () => {
      const sim = new Simulation(quickLevel);
      for (let i = 0; i < 150; i++)
        sim.step(commands.filter((command) => command.tick === sim.tick));
      return sim.getSnapshot();
    };
    expect(run()).toEqual(run());
    expect(run().result).toBe('victory');
  });

  it('rejects an invalid victory fraction', () => {
    for (const victoryFraction of [0, -1, 1.01, NaN])
      expect(() => new Simulation({ ...S0_LEVEL, victoryFraction })).toThrow();
  });
});

it('split groups cover the two flanks faster than one concentrated group in a controlled scenario', () => {
  const run = (split: boolean) => {
    const sim = new Simulation({ ...S0_LEVEL, victoryFraction: 1 });
    sim.step([{ tick: 0, type: 'select-group-id', groupId: 'group-1' }]);
    sim.step([
      {
        tick: 1,
        type: 'set-formation',
        groupId: 'group-1',
        points: [
          { x: 200, y: 500 },
          { x: 980, y: 500 },
        ],
      },
    ]);
    if (split) {
      sim.step([
        {
          tick: 2,
          type: 'cut',
          groupId: 'group-1',
          points: [
            { x: 590, y: 400 },
            { x: 590, y: 600 },
          ],
        },
      ]);
      sim.step([
        {
          tick: 3,
          type: 'set-formation',
          groupId: 'group-2',
          points: [
            { x: 200, y: 200 },
            { x: 980, y: 200 },
          ],
        },
      ]);
      sim.step([{ tick: 4, type: 'select-group-id', groupId: 'group-3' }]);
      sim.step([
        {
          tick: 5,
          type: 'set-formation',
          groupId: 'group-3',
          points: [
            { x: 200, y: 800 },
            { x: 980, y: 800 },
          ],
        },
      ]);
    } else {
      sim.step([
        {
          tick: 2,
          type: 'set-formation',
          groupId: 'group-1',
          points: [
            { x: 200, y: 200 },
            { x: 980, y: 200 },
          ],
        },
      ]);
    }
    while (sim.tick < 480) sim.step();
    return sim.getSnapshot().paintCells.filter((cell) => cell.owner === 'blue').length;
  };
  expect(run(true)).toBeGreaterThan(run(false));
});
