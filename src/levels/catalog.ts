import { GAME_LEVEL } from '../core/config';
import { IZLUCHINA } from './izluchina';

export const LEVELS = [
  { id: 'original', title: 'Два прохода', config: GAME_LEVEL, lanes: [250, 750] },
  { id: 'izluchina', title: 'Излучина', config: IZLUCHINA, lanes: [] },
] as const;

export function levelUrl(id: (typeof LEVELS)[number]['id']): string {
  return id === 'original' ? './' : `?level=${id}`;
}
