import { GAME_LEVEL } from '../core/config';
import type { LevelConfig } from '../core/types';

const flankDefense = { radius: 270, leash: 150 };
const checkpointDefense = { radius: 310, leash: 200 };
const supportDefense = { radius: 245, leash: 185 };
const finalDefense = { radius: 320, leash: 210 };

// [P] Map geometry and placement are independent from the shared combat rules.
export const IZLUCHINA: LevelConfig = {
  ...GAME_LEVEL,
  seed: 20261111,
  checkpoints: [
    { area: { x: 1760, y: 600, width: 160, height: 200 }, viewEnd: 2000 },
    { area: { x: 3680, y: 200, width: 160, height: 200 }, viewEnd: 4000 },
  ],
  objective: { x: 5600, y: 400, width: 320, height: 200 },
  shorePonds: [
    { x: 720, y: 400, width: 80, height: 200 },
    { x: 800, y: 300, width: 480, height: 300 },
    { x: 1280, y: 300, width: 160, height: 200 },
    { x: 1440, y: 300, width: 80, height: 100 },
    { x: 2800, y: 400, width: 160, height: 200 },
    { x: 2960, y: 400, width: 320, height: 300 },
    { x: 3280, y: 500, width: 80, height: 200 },
  ],
  ponds: { count: 0, candidates: [] },
  randomWalls: { count: 0, candidates: [] },
  obstacles: [
    { x: 960, y: 900, width: 240, height: 100 },
    { x: 1360, y: 700, width: 80, height: 100 },
    { x: 2240, y: 0, width: 80, height: 250 },
    { x: 2240, y: 520, width: 80, height: 200 },
    { x: 2480, y: 880, width: 160, height: 40 },
    { x: 3360, y: 0, width: 80, height: 140 },
    { x: 3360, y: 640, width: 80, height: 100 },
    { x: 4400, y: 230, width: 240, height: 100 },
    { x: 4560, y: 640, width: 240, height: 100 },
    { x: 4800, y: 320, width: 160, height: 80 },
    { x: 4960, y: 750, width: 80, height: 100 },
  ],
  enemyPosts: [
    { count: 16, columns: 4, centerX: 1620, centerY: 155, localDefense: flankDefense },
    { count: 18, columns: 5, centerX: 1700, centerY: 730, localDefense: checkpointDefense },
    { count: 20, columns: 5, centerX: 2600, centerY: 470, localDefense: flankDefense },
    { count: 18, columns: 5, centerX: 3620, centerY: 285, localDefense: checkpointDefense },
    { count: 12, columns: 4, centerX: 2930, centerY: 810, localDefense: flankDefense },
    { count: 14, columns: 5, centerX: 5140, centerY: 180, localDefense: finalDefense },
    { count: 20, columns: 5, centerX: 5470, centerY: 510, localDefense: finalDefense },
    { count: 14, columns: 5, centerX: 5280, centerY: 850, localDefense: finalDefense },
    { count: 1, columns: 1, centerX: 5520, centerY: 255, deviant: true },
    { count: 1, columns: 1, centerX: 5540, centerY: 750, deviant: true },
    // The flank posts engage only as blue units approach the checkpoints.
    { count: 4, columns: 2, centerX: 1960, centerY: 565, localDefense: supportDefense },
    { count: 5, columns: 2, centerX: 1950, centerY: 835, localDefense: supportDefense },
    { count: 4, columns: 2, centerX: 3900, centerY: 155, localDefense: supportDefense },
    { count: 5, columns: 2, centerX: 3910, centerY: 425, localDefense: supportDefense },
  ],
  hazards: {
    ...GAME_LEVEL.hazards!,
    slow: [
      { x: 1080, y: 735, radius: 58 },
      { x: 1750, y: 850, radius: 48 },
      { x: 2420, y: 760, radius: 55 },
      { x: 3140, y: 275, radius: 54 },
      { x: 4920, y: 565, radius: 62 },
    ],
    mines: [
      { x: 1200, y: 815 },
      { x: 2720, y: 770 },
      { x: 3170, y: 825 },
      { x: 5060, y: 270 },
      { x: 5160, y: 760 },
    ],
    cannons: [
      { x: 2670, y: 930 },
      { x: 4720, y: 100 },
    ],
  },
};
