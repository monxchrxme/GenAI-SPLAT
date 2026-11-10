import { Session } from './app/session';
import { S0_CLOCK, GAME_LEVEL } from './core/config';
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
  const outcome = requiredElement('outcome');
  requiredElement('paint-goal').textContent =
    `Территория / цель ${Math.round(GAME_LEVEL.victoryFraction * 100)}%`;
  const cameraLeft = requiredElement<HTMLButtonElement>('camera-left');
  const cameraRight = requiredElement<HTMLButtonElement>('camera-right');
  const merge = requiredElement<HTMLButtonElement>('merge');
  const cut = requiredElement<HTMLButtonElement>('cut');
  const restart = requiredElement<HTMLButtonElement>('restart');
  const reinforce = requiredElement<HTMLButtonElement>('reinforce');
  const session = new Session(GAME_LEVEL, S0_CLOCK);
  const renderer = new PixiRenderer();
  const hud = new Hud(
    requiredElement('agent-count'),
    requiredElement('group-count'),
    requiredElement('red-count'),
    requiredElement('paint-progress'),
    requiredElement('objective-status'),
    requiredElement('reinforcement-credits'),
    hint,
  );

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
  const panLeft = () => {
    drawing.cancel();
    renderer.pan(-1);
  };
  const panRight = () => {
    drawing.cancel();
    renderer.pan(1);
  };
  cameraLeft.addEventListener('click', panLeft);
  cameraRight.addEventListener('click', panRight);
  const reinforceSelected = () => {
    const state = session.getSnapshot();
    if (!reinforce.disabled && state.selectedGroupId)
      session.submit({ type: 'reinforce', groupId: state.selectedGroupId });
  };
  const reinforceKey = (event: KeyboardEvent) => {
    if (
      event.code !== 'KeyR' ||
      event.repeat ||
      event.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      (event.target instanceof HTMLElement &&
        (event.target.isContentEditable || event.target.closest('input, textarea, select')))
    )
      return;
    event.preventDefault();
    reinforceSelected();
  };
  const reinforcement = GAME_LEVEL.reinforcement!;
  requiredElement('reinforcement-label').textContent = `Ресурс / ${reinforcement.cost}`;
  reinforce.title = `${reinforcement.cost} ед. ресурса → до ${reinforcement.count} Сплатов в выбранную группу`;
  reinforce.addEventListener('click', reinforceSelected);
  window.addEventListener('keydown', reinforceKey);
  const toggleCut = () => drawing.splitSelected();
  cut.addEventListener('click', toggleCut);
  const toggleMerge = () => drawing.toggleMerge();
  merge.addEventListener('click', toggleMerge);
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
    const blueCount = snapshot.agents.filter(
      (agent) => agent.alive && agent.factionId === 'blue',
    ).length;
    const selected = snapshot.groups.find((group) => group.id === snapshot.selectedGroupId);
    cut.disabled =
      snapshot.phase !== 'running' ||
      selected?.factionId !== 'blue' ||
      selected.agentIds.length < 2 ||
      Boolean(
        snapshot.merge &&
        selected &&
        [snapshot.merge.first, snapshot.merge.second].includes(selected.id),
      );
    reinforce.disabled =
      snapshot.phase !== 'running' ||
      selected?.factionId !== 'blue' ||
      snapshot.reinforcementCredits < reinforcement.cost ||
      blueCount >= reinforcement.maxBlue;
    outcome.hidden = snapshot.result === null;
    outcome.textContent =
      snapshot.result === 'victory'
        ? 'Победа! Территория захвачена. Нажмите «Заново», чтобы повторить.'
        : 'Поражение. Все синие Сплаты потеряны. Нажмите «Заново», чтобы повторить.';
    merge.setAttribute('aria-pressed', String(drawing.mergeMode));
    if (drawing.mergeMode)
      hint.textContent = 'Режим Merge: выберите вторую группу. M или Esc — отмена.';
    else if (snapshot.merge)
      hint.textContent = `Группы ${snapshot.merge.first} и ${snapshot.merge.second} сближаются.`;
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
    cameraLeft.removeEventListener('click', panLeft);
    cameraRight.removeEventListener('click', panRight);
    reinforce.removeEventListener('click', reinforceSelected);
    window.removeEventListener('keydown', reinforceKey);
    cut.removeEventListener('click', toggleCut);
    merge.removeEventListener('click', toggleMerge);
    document.removeEventListener('visibilitychange', discardHiddenTime);
    window.removeEventListener('pagehide', dispose);
    renderer.destroy();
  };
  window.addEventListener('pagehide', dispose);
  import.meta.hot?.dispose(dispose);
}

void start();
