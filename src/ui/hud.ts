import type { Snapshot } from '../core/types';
import type { DrawingPreview } from '../input/groupSelectionInput';
import { tensionActive } from '../core/tension';

export class Hud {
  constructor(
    private readonly agentCount: HTMLElement,
    private readonly groupCount: HTMLElement,
    private readonly hint: HTMLElement,
  ) {}

  draw(snapshot: Snapshot, preview?: DrawingPreview): void {
    this.agentCount.textContent = String(snapshot.agents.filter((agent) => agent.alive).length);
    this.groupCount.textContent = String(snapshot.groups.length);
    const selected = snapshot.groups.find((group) => group.id === snapshot.selectedGroupId);
    const moving = snapshot.agents.some(
      (a) => a.groupId === selected?.id && (a.vx !== 0 || a.vy !== 0),
    );
    const tension =
      preview?.active || preview?.pending
        ? preview.stretched
        : tensionActive(selected, snapshot.tick);
    if (selected && tension) {
      const text = `Выбрана группа · ${selected.agentIds.length} Сплатов. Натяжение: построение растянуто. ${preview?.active ? (preview.limited ? 'Лимит линии — отпустите кнопку. Группа остаётся целой.' : 'Отпустите для перестроения. Группа остаётся целой.') : 'Группа остаётся целой.'}`;
      if (this.hint.textContent !== text) this.hint.textContent = text;
      return;
    }
    const text = selected
      ? `Выбрана группа · ${selected.agentIds.length} Сплатов. ${preview?.active ? (preview.limited ? 'Достигнут предел линии — отпустите кнопку.' : 'Рисуйте линию; отпустите для перестроения. Esc — отмена текущего жеста.') : preview && preview.points.length >= 2 ? `${moving ? 'Занимаем форму' : 'Форма занята'} · ${preview.slots.length} мест. Пустой клик — остановить и очистить; Esc отменяет только текущий жест.` : 'Зажмите ЛКМ на свободном поле и нарисуйте линию.'}`
      : 'Выберите группу: нажмите на синий маркер или между близкими маркерами.';
    if (this.hint.textContent !== text) this.hint.textContent = text;
  }
}
