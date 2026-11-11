import { GAME_LEVEL } from '../core/config';
import type { LevelConfig } from '../core/types';

// [P] Authored courtyards and independent posts; shared combat rules are unchanged.
const garrison = { radius: 280, leash: 180 };
const support = { radius: 230, leash: 170 };
const flank = { radius: 250, leash: 160 };

export const REDOUBTS: LevelConfig = {
  ...GAME_LEVEL,
  seed: 20261112,
  world: { width: 7200, height: 1000 },
  paint: { ...GAME_LEVEL.paint, columns: 90 },
  checkpoints: [
    { area: { x: 1680, y: 200, width: 160, height: 200 }, viewEnd: 2160 },
    { area: { x: 3440, y: 600, width: 160, height: 200 }, viewEnd: 3840 },
    { area: { x: 5200, y: 400, width: 160, height: 200 }, viewEnd: 5600 },
  ],
  objective: { x: 6800, y: 400, width: 320, height: 200 },
  shorePonds: [
    { x: 0, y: 0, width: 80, height: 1000 },
    { x: 80, y: 0, width: 160, height: 100 },
    { x: 80, y: 900, width: 240, height: 100 },
    { x: 240, y: 0, width: 160, height: 200 },
    { x: 320, y: 800, width: 160, height: 200 },
  ],
  ponds: { count: 0, candidates: [] },
  randomWalls: { count: 0, candidates: [] },
  obstacles: [
    { x: 880, y: 400, width: 1040, height: 100 },
    { x: 960, y: 100, width: 160, height: 100 },
    { x: 2320, y: 300, width: 400, height: 100 },
    { x: 2960, y: 500, width: 640, height: 100 },
    { x: 4480, y: 200, width: 560, height: 100 },
    { x: 4480, y: 700, width: 560, height: 100 },
    { x: 5920, y: 200, width: 160, height: 200 },
    { x: 6160, y: 600, width: 240, height: 100 },
    { x: 6480, y: 200, width: 160, height: 100 },
  ],
  enemyPosts: [
    { count: 16, columns: 4, centerX: 1600, centerY: 250, localDefense: garrison },
    { count: 5, columns: 2, centerX: 1980, centerY: 220, localDefense: support },
    { count: 6, columns: 3, centerX: 1280, centerY: 750, localDefense: flank },
    { count: 24, columns: 6, centerX: 3370, centerY: 730, localDefense: garrison },
    { count: 7, columns: 3, centerX: 3710, centerY: 650, localDefense: support },
    { count: 7, columns: 3, centerX: 3680, centerY: 870, localDefense: support },
    { count: 8, columns: 4, centerX: 2500, centerY: 240, localDefense: flank },
    // The deviant covers the capture area, including its lower approach.
    { count: 1, columns: 1, centerX: 5300, centerY: 600, deviant: true },
    { count: 20, columns: 5, centerX: 5140, centerY: 490, localDefense: garrison },
    { count: 6, columns: 3, centerX: 5480, centerY: 330, localDefense: support },
    { count: 10, columns: 5, centerX: 4910, centerY: 120, localDefense: flank },
    { count: 10, columns: 5, centerX: 4890, centerY: 860, localDefense: flank },
    { count: 16, columns: 5, centerX: 6420, centerY: 790, localDefense: flank },
    { count: 22, columns: 6, centerX: 6730, centerY: 500, localDefense: garrison },
    { count: 8, columns: 4, centerX: 6990, centerY: 720, localDefense: support },
    { count: 1, columns: 1, centerX: 6880, centerY: 300, deviant: true },
    { count: 1, columns: 1, centerX: 7000, centerY: 700, deviant: true },
  ],
  hazards: {
    ...GAME_LEVEL.hazards!,
    slow: [
      { x: 1200, y: 250, radius: 60 },
      { x: 2820, y: 750, radius: 64 },
      { x: 4500, y: 500, radius: 60 },
      { x: 5880, y: 500, radius: 60 },
      { x: 6500, y: 790, radius: 55 },
    ],
    mines: [
      { x: 1120, y: 780 },
      { x: 2540, y: 720 },
      { x: 4240, y: 840 },
      { x: 5840, y: 820 },
    ],
    mineCount: 3,
    cannons: [
      { x: 2820, y: 920 },
      { x: 6120, y: 100 },
      { x: 6520, y: 900 },
    ],
  },
};
