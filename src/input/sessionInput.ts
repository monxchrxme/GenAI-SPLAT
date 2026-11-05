import type { GameCommand } from '../core/types';

export function bindSessionInput(
  button: HTMLButtonElement,
  submit: (type: GameCommand['type']) => void,
): () => void {
  const restart = () => submit('restart');
  button.addEventListener('click', restart);
  // Native button keyboard activation covers Enter/Space without gameplay gestures.
  return () => button.removeEventListener('click', restart);
}
