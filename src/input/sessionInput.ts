import type { CommandIntent } from '../core/types';

export function bindSessionInput(
  button: HTMLButtonElement,
  submit: (intent: CommandIntent) => void,
): () => void {
  const restart = () => submit({ type: 'restart' });
  button.addEventListener('click', restart);
  // Native button keyboard activation covers Enter/Space without gameplay gestures.
  return () => button.removeEventListener('click', restart);
}
