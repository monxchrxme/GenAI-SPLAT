import { Session } from '../app/session';
import { GAME_LEVEL, S0_CLOCK, S0_LEVEL } from '../core/config';
import type { LevelConfig, Snapshot } from '../core/types';
import { bindGroupSelectionInput } from '../input/groupSelectionInput';
import { PixiRenderer } from '../rendering/pixiRenderer';

const practiceLevel: LevelConfig = {
  ...S0_LEVEL,
  victoryFraction: 1,
  spawn: { ...S0_LEVEL.spawn, count: 12, columns: 4 },
  initialHp: GAME_LEVEL.initialHp,
  enemy: {
    ...GAME_LEVEL.enemy!,
    count: 3,
    columns: 1,
    centerX: 1150,
    centerY: 500,
    advanceDistance: 0,
  },
  combat: GAME_LEVEL.combat!,
};

const lessons = [
  'Нажмите на синих, чтобы выбрать отряд. Кольца покажут выбранных бойцов.',
  'Щёлкните по свободному месту. Весь отряд пойдёт туда в прежнем строю.',
  'Зажмите кнопку мыши на свободном поле, проведите длинную линию и отпустите. Бойцы займут места на линии и начнут красить землю вокруг себя.',
  'Нажмите X или «Разделить». Из выбранного отряда получатся два.',
  'Кликните по свободному месту, чтобы отвести выбранный отряд в сторону. Второй сохранит свой приказ.',
  'Нажмите M или «Объединить», затем кликните по другому синему отряду. Подождите, пока они сойдутся.',
  'Подведите синих к красным справа. Бойцы атакуют сами. Держите отряд вместе, чтобы несколько бойцов могли атаковать одновременно.',
] as const;

interface TutorialControls {
  dialog: HTMLDialogElement;
  open: HTMLButtonElement;
  close: HTMLButtonElement;
  field: HTMLElement;
  step: HTMLElement;
  split: HTMLButtonElement;
  merge: HTMLButtonElement;
  restart: HTMLButtonElement;
}

export function bindTutorial(ui: TutorialControls, onOpen: () => void): () => void {
  let disposePractice: (() => void) | undefined;
  let opening = 0;

  const close = () => ui.dialog.close();
  const cleanup = () => {
    opening++;
    disposePractice?.();
    disposePractice = undefined;
  };

  const open = async () => {
    if (ui.dialog.open) return;
    cleanup();
    const attempt = opening;
    onOpen();
    ui.dialog.showModal();
    ui.step.textContent = 'Подготовка тренировочного поля…';
    ui.split.disabled = ui.merge.disabled = ui.restart.disabled = true;
    ui.merge.setAttribute('aria-pressed', 'false');
    const session = new Session(practiceLevel, S0_CLOCK);
    const renderer = new PixiRenderer();
    try {
      await renderer.init(ui.field, session.getSnapshot());
    } catch (error) {
      if (ui.dialog.open && opening === attempt)
        ui.step.textContent =
          'Не удалось открыть тренировочное поле. Закройте урок и попробуйте ещё раз.';
      console.error(error);
      return;
    }
    if (!ui.dialog.open || opening !== attempt) {
      renderer.destroy();
      return;
    }

    renderer.canvas.setAttribute('aria-label', 'Тренировочное поле с синими и красными');
    const drawing = bindGroupSelectionInput(
      renderer.canvas,
      (point) => renderer.toWorld(point),
      (intent) => session.submit(intent),
      () => session.getSnapshot(),
      () => ui.dialog.open,
    );
    const resize = new ResizeObserver(() => {
      drawing.cancel();
      renderer.resize(ui.field.clientWidth, ui.field.clientHeight);
    });
    resize.observe(ui.field);
    let lesson = 0;
    let failed = false;
    let lastTime: number | null = null;
    let frameId = 0;

    const showStep = () => {
      const hint = lessons[lesson];
      ui.step.textContent = failed
        ? 'Синие потеряны. Нажмите «Начать урок заново», чтобы попробовать ещё раз.'
        : hint
          ? `Шаг ${lesson + 1} из ${lessons.length}. ${hint}`
          : 'Урок пройден! В партии закрасьте рубеж и финальную точку. За побеждённых красных можно пополнить выбранный отряд кнопкой R.';
    };
    const checkStep = (snapshot: Snapshot) => {
      const selected = snapshot.groups.find((group) => group.id === snapshot.selectedGroupId);
      const groups = snapshot.groups.filter((group) => group.factionId === 'blue');
      const formation = selected?.formation;
      const canAdvance = [
        selected !== undefined,
        formation?.points.length === 0,
        (formation?.points.length ?? 0) > 1,
        groups.length >= 2,
        groups.length >= 2 && formation?.points.length === 0,
        groups.length === 1 && snapshot.merge === null,
        !snapshot.agents.some((agent) => agent.factionId === 'red' && agent.alive),
      ][lesson];
      const lost = snapshot.result === 'defeat';
      if (canAdvance || failed !== lost) {
        if (canAdvance && !lost) lesson++;
        failed = lost;
        showStep();
      }
      ui.split.disabled = failed || (selected?.agentIds.length ?? 0) < 2;
      ui.merge.disabled = failed || groups.length < 2;
    };
    const frame = (time: number) => {
      if (!ui.dialog.open) return;
      const snapshot = session.advance(lastTime === null ? 0 : time - lastTime);
      lastTime = time;
      checkStep(snapshot);
      renderer.draw(snapshot, session.restartCount, drawing.preview());
      ui.merge.setAttribute('aria-pressed', String(drawing.mergeMode));
      frameId = requestAnimationFrame(frame);
    };
    const split = () => drawing.splitSelected();
    const merge = () => drawing.toggleMerge();
    const restart = () => {
      drawing.reset();
      session.submit('restart');
      lesson = 0;
      failed = false;
      showStep();
    };
    const discardHiddenTime = () => {
      lastTime = null;
      session.discardFrameTime();
    };
    ui.split.addEventListener('click', split);
    ui.merge.addEventListener('click', merge);
    ui.restart.addEventListener('click', restart);
    document.addEventListener('visibilitychange', discardHiddenTime);
    ui.restart.disabled = false;
    showStep();
    frameId = requestAnimationFrame(frame);

    disposePractice = () => {
      cancelAnimationFrame(frameId);
      resize.disconnect();
      drawing.dispose();
      ui.split.removeEventListener('click', split);
      ui.merge.removeEventListener('click', merge);
      ui.restart.removeEventListener('click', restart);
      document.removeEventListener('visibilitychange', discardHiddenTime);
      renderer.destroy();
    };
  };

  const onClose = () => {
    if (ui.dialog.open) return;
    cleanup();
    ui.open.focus();
  };
  ui.open.addEventListener('click', open);
  ui.close.addEventListener('click', close);
  ui.dialog.addEventListener('close', onClose);
  ui.open.disabled = false;
  return () => {
    ui.open.removeEventListener('click', open);
    ui.close.removeEventListener('click', close);
    ui.dialog.removeEventListener('close', onClose);
    close();
    cleanup();
  };
}
