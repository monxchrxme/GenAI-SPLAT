import { Session } from './app/session';
import { S0_CLOCK, S0_LEVEL } from './core/config';
import { bindSessionInput } from './input/sessionInput';
import { PixiRenderer } from './rendering/pixiRenderer';
import { Hud } from './ui/hud';
import './style.css';

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element: ${id}`);
  return element as T;
}

async function start(): Promise<void> {
  const arena = requiredElement('arena');
  const hint = requiredElement('hint');
  const restart = requiredElement<HTMLButtonElement>('restart');
  const session = new Session(S0_LEVEL, S0_CLOCK);
  const renderer = new PixiRenderer();
  const hud = new Hud(requiredElement('agent-count'), requiredElement('group-count'));

  try {
    await renderer.init(arena, session.getSnapshot());
  } catch (error) {
    hint.textContent = 'Не удалось открыть поле. Проверьте WebGL и перезагрузите страницу.';
    hint.classList.add('error');
    console.error(error);
    return;
  }

  const unbindInput = bindSessionInput(restart, (type) => session.submit(type));
  const observer = new ResizeObserver(() => renderer.resize(arena.clientWidth, arena.clientHeight));
  observer.observe(arena);
  let lastTime: number | null = null;
  let frameId = 0;
  let disposed = false;

  const frame = (time: number) => {
    if (disposed) return;
    const snapshot = session.advance(lastTime === null ? 0 : time - lastTime);
    lastTime = time;
    renderer.draw(snapshot, session.restartCount);
    hud.draw(snapshot);
    frameId = requestAnimationFrame(frame);
  };
  const discardHiddenTime = () => {
    lastTime = null;
    session.discardFrameTime();
  };
  document.addEventListener('visibilitychange', discardHiddenTime);
  renderer.draw(session.getSnapshot(), session.restartCount);
  hud.draw(session.getSnapshot());
  restart.disabled = false;
  hint.textContent = '40 маркеров · одна группа. «Заново» восстанавливает начальное поле.';
  arena.dataset.ready = 'true';
  frameId = requestAnimationFrame(frame);

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frameId);
    observer.disconnect();
    unbindInput();
    document.removeEventListener('visibilitychange', discardHiddenTime);
    window.removeEventListener('pagehide', dispose);
    renderer.destroy();
  };
  window.addEventListener('pagehide', dispose);
  import.meta.hot?.dispose(dispose);
}

void start();
