import { GAME_LEVEL, S0_LEVEL } from '../../src/core/config';
import type { LevelConfig } from '../../src/core/types';

// Preserve the exact S4/S5 scenarios while the live level grows to three sectors.
const {
  enemyPosts: posts,
  objective,
  checkpoints,
  hazards,
  ponds,
  shorePonds,
  randomWalls,
  deviant,
  ...baseLevel
} = GAME_LEVEL;
void posts;
void objective;
void checkpoints;
void hazards;
void ponds;
void shorePonds;
void randomWalls;
void deviant;
export const DELIVERY2_LEVEL: LevelConfig = {
  ...baseLevel,
  world: { width: 3200, height: 1000 },
  paint: { ...S0_LEVEL.paint, columns: 40 },
  obstacles: GAME_LEVEL.obstacles!.slice(0, 3),
};
