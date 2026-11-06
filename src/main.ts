import { Session } from './app/session';
import { S0_CLOCK, S0_LEVEL } from './core/config';
import { bindSessionInput } from './input/sessionInput';
import { bindGroupSelectionInput } from './input/groupSelectionInput';
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
  const hud = new Hud(requiredElement('agent-count'), requiredElement('group-count'), hint);

  try {
    await renderer.init(arena, session.getSnapshot());
  } catch (error) {
    hint.textContent = 'Не удалось открыть поле. Проверьте WebGL и перезагрузите страницу.';
    hint.classList.add('error');
    console.error(error);
    return;
  }

  const unbindInput = bindSessionInput(restart, (type) => {
    drawing.reset();
    session.submit(type);
  });
  const drawing = bindGroupSelectionInput(
    renderer.canvas,
    (point) => renderer.toWorld(point),
    (intent) => session.submit(intent),
    () => session.getSnapshot(),
  );
  let arenaWidth = arena.clientWidth;
  let arenaHeight = arena.clientHeight;
  const observer = new ResizeObserver(() => {
    if (arenaWidth === arena.clientWidth && arenaHeight === arena.clientHeight) return;
    arenaWidth = arena.clientWidth;
    arenaHeight = arena.clientHeight;
    drawing.cancel();
    renderer.resize(arenaWidth, arenaHeight);
  });
  observer.observe(arena);
  let lastTime: number | null = null;
  let frameId = 0;
  let disposed = false;

  const frame = (time: number) => {
    if (disposed) return;
    const snapshot = session.advance(lastTime === null ? 0 : time - lastTime);
    lastTime = time;
    const preview = drawing.preview();
    renderer.draw(snapshot, session.restartCount, preview);
    hud.draw(snapshot, preview);
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
  arena.dataset.ready = 'true';
  frameId = requestAnimationFrame(frame);

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frameId);
    observer.disconnect();
    unbindInput();
    drawing.dispose();
    document.removeEventListener('visibilitychange', discardHiddenTime);
    window.removeEventListener('pagehide', dispose);
    renderer.destroy();
  };
  window.addEventListener('pagehide', dispose);
  import.meta.hot?.dispose(dispose);
}

void start();
