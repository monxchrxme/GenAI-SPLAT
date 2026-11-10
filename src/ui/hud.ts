import type { Snapshot } from '../core/types';
import type { DrawingPreview } from '../input/groupSelectionInput';
import { territoryPercent } from '../core/territoryProgress';
import { tensionActive } from '../core/tension';

export class Hud {
  constructor(
    private readonly agentCount: HTMLElement,
    private readonly groupCount: HTMLElement,
    private readonly redCount: HTMLElement,
    private readonly paintProgress: HTMLElement,
    private readonly checkpointStatus: HTMLElement,
    private readonly objectiveStatus: HTMLElement,
    private readonly credits: HTMLElement,
    private readonly hint: HTMLElement,
  ) {}

  draw(snapshot: Snapshot, preview?: DrawingPreview): void {
    this.agentCount.textContent = String(
      snapshot.agents.filter((agent) => agent.alive && agent.factionId === 'blue').length,
    );
    this.groupCount.textContent = String(
      snapshot.groups.filter((group) => group.factionId === 'blue').length,
    );
    this.redCount.textContent = String(
      snapshot.agents.filter((agent) => agent.alive && agent.factionId === 'red').length,
    );
    this.credits.textContent = String(snapshot.reinforcementCredits);
    const accessibleCells = snapshot.paintCells.filter((cell) => !cell.blocked);
    this.paintProgress.textContent = `${territoryPercent(accessibleCells.filter((cell) => cell.owner === 'blue').length, accessibleCells.length)}%`;
    const captured = snapshot.checkpoints.filter((point) => point.captured).length;
    this.checkpointStatus.textContent =
      snapshot.checkpoints.length === 1
        ? captured
          ? 'пройден'
          : 'не пройден'
        : `${captured}/${snapshot.checkpoints.length}`;
    this.objectiveStatus.textContent = snapshot.objective
      ? snapshot.objective.captured
        ? 'захвачена'
        : 'не захвачена'
      : '—';
    const selected = snapshot.groups.find((group) => group.id === snapshot.selectedGroupId);
    if (preview?.blocked) {
      this.hint.textContent =
        'Построение попадает на препятствие или за край поля. Выберите свободное место.';
      return;
    }
    if (selected?.factionId === 'red') {
      this.hint.textContent = `Красная группа · ${selected.agentIds.length} Сплатов (${selected.id}). Противник управляется самостоятельно.`;
      return;
    }
    const moving = snapshot.agents.some(
      (a) => a.groupId === selected?.id && (a.vx !== 0 || a.vy !== 0),
    );
    const tension =
      preview?.active || preview?.pending
        ? preview.stretched
        : tensionActive(selected, snapshot.tick);
    if (selected && tension) {
      const text = `Выбрана группа · ${selected.agentIds.length} Сплатов (${selected.id}). Натяжение: построение растянуто. ${preview?.active ? (preview.limited ? 'Лимит линии — отпустите кнопку. Группа остаётся целой.' : 'Отпустите для перестроения. Группа остаётся целой.') : 'Группа остаётся целой.'}`;
      if (this.hint.textContent !== text) this.hint.textContent = text;
      return;
    }
    const text = selected
      ? `Выбрана группа · ${selected.agentIds.length} Сплатов (${selected.id}). ${preview?.active ? (preview.limited ? 'Достигнут предел линии — отпустите кнопку.' : 'Рисуйте линию; отпустите для перестроения. Esc — отмена текущего жеста.') : preview && preview.slots.length > 0 ? `${moving ? 'Движение' : 'Позиция занята'} · ${preview.slots.length} мест. Клик по полю — движение; линия — новое построение.` : 'Клик по полю — движение; зажмите ЛКМ и нарисуйте линию для построения.'}`
      : 'Выберите группу: нажмите на синий маркер или между близкими маркерами.';
    if (this.hint.textContent !== text) this.hint.textContent = text;
  }
}
