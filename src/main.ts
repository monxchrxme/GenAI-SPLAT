import { Session } from './app/session';
import { S0_CLOCK } from './core/config';
import { LEVELS, levelUrl } from './levels/catalog';
import type { Snapshot } from './core/types';
import { bindSessionInput } from './input/sessionInput';
import { bindGroupSelectionInput } from './input/groupSelectionInput';
import { PixiRenderer } from './rendering/pixiRenderer';
import { Hud } from './ui/hud';
import { bindTutorial } from './ui/tutorial';
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
  const cameraLeft = requiredElement<HTMLButtonElement>('camera-left');
  const cameraRight = requiredElement<HTMLButtonElement>('camera-right');
  const merge = requiredElement<HTMLButtonElement>('merge');
  const cut = requiredElement<HTMLButtonElement>('cut');
  const restart = requiredElement<HTMLButtonElement>('restart');
  const reinforce = requiredElement<HTMLButtonElement>('reinforce');
  const tutorial = requiredElement<HTMLDialogElement>('tutorial');
  const menu = requiredElement<HTMLDialogElement>('level-menu');
  const menuOpen = requiredElement<HTMLButtonElement>('level-menu-open');
  const menuClose = requiredElement<HTMLButtonElement>('level-menu-close');
  const menuTitle = requiredElement('level-menu-title');
  const nextLevel = requiredElement<HTMLAnchorElement>('next-level');
  const requestedLevel = new URLSearchParams(location.search).get('level');
  const level = LEVELS.find((item) => item.id === requestedLevel) ?? LEVELS[0];
  const next = LEVELS[LEVELS.indexOf(level) + 1];
  const levelList = requiredElement('level-list');
  requiredElement('level-menu-current').textContent = level.title;
  for (const item of LEVELS) {
    const link = document.createElement('a');
    link.className = 'menu-link';
    link.href = levelUrl(item.id);
    link.textContent = item.title;
    if (item === level) link.setAttribute('aria-current', 'true');
    levelList.append(link);
  }
  if (next) nextLevel.href = levelUrl(next.id);
  requiredElement('checkpoint-label').textContent =
    (level.config.checkpoints?.length ?? 0) > 1 ? 'Рубежи' : 'Рубеж';
  const session = new Session(level.config, S0_CLOCK);
  const renderer = new PixiRenderer(level.config, level.lanes);
  const hud = new Hud(
    requiredElement('agent-count'),
    requiredElement('group-count'),
    requiredElement('red-count'),
    requiredElement('paint-progress'),
    requiredElement('checkpoint-status'),
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
    menu.close();
    drawing.reset();
    session.submit(type);
  });
  const drawing = bindGroupSelectionInput(
    renderer.canvas,
    (point) => renderer.toWorld(point),
    (intent) => session.submit(intent),
    () => session.getSnapshot(),
    () => !tutorial.open && !menu.open,
  );
  const unbindTutorial = bindTutorial(
    {
      dialog: tutorial,
      open: requiredElement<HTMLButtonElement>('tutorial-open'),
      close: requiredElement<HTMLButtonElement>('tutorial-close'),
      field: requiredElement('tutorial-field'),
      step: requiredElement('tutorial-step'),
      split: requiredElement<HTMLButtonElement>('tutorial-split'),
      merge: requiredElement<HTMLButtonElement>('tutorial-merge'),
      restart: requiredElement<HTMLButtonElement>('tutorial-restart'),
    },
    () => drawing.cancel(),
  );
  const showMenu = (result: Snapshot['result']) => {
    if (menu.open) return;
    drawing.cancel();
    menuTitle.textContent =
      result === 'victory' ? 'Победа' : result === 'defeat' ? 'Поражение' : 'Уровни';
    nextLevel.hidden = result !== 'victory' || !next;
    restart.textContent = result ? 'Повторить уровень' : 'Заново';
    menu.showModal();
    if (result) (nextLevel.hidden ? restart : nextLevel).focus();
  };
  const openMenu = () => showMenu(session.getSnapshot().result);
  const closeMenu = () => menu.close();
  menuOpen.addEventListener('click', openMenu);
  menuClose.addEventListener('click', closeMenu);
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
      tutorial.open ||
      menu.open ||
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
  const reinforcement = level.config.reinforcement!;
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
  let resultShown = false;

  const frame = (time: number) => {
    if (disposed) return;
    if (tutorial.open || menu.open) {
      lastTime = null;
      frameId = requestAnimationFrame(frame);
      return;
    }
    const snapshot = session.advance(lastTime === null ? 0 : time - lastTime);
    lastTime = time;
    const preview = drawing.preview();
    renderer.draw(snapshot, session.restartCount, preview);
    cameraRight.disabled = renderer.atCheckpointLimit;
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
    outcome.textContent = snapshot.result === 'victory' ? 'Победа' : 'Поражение';
    if (snapshot.result && !resultShown) showMenu(snapshot.result);
    resultShown = snapshot.result !== null;
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
  menuOpen.disabled = false;
  arena.dataset.ready = 'true';
  frameId = requestAnimationFrame(frame);

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frameId);
    observer.disconnect();
    unbindInput();
    unbindTutorial();
    menuOpen.removeEventListener('click', openMenu);
    menuClose.removeEventListener('click', closeMenu);
    menu.close();
    levelList.replaceChildren();
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
