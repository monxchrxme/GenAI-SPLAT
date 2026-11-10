import { DRAWING, S0_LEVEL } from '../core/config';
import { PolylineDraft } from '../core/polyline';
import type {
  CommandIntent,
  Formation,
  FormationSlot,
  GroupId,
  Point,
  Snapshot,
} from '../core/types';
import { isStretched } from '../core/tension';
import { createFormation } from '../core/formation';
import { pickGroupAtPoint } from '../simulation/selection';
import { pointBlocked, UNIT_CLEARANCE } from '../simulation/obstacles';

export interface DrawingPreview {
  readonly points: readonly Point[];
  readonly active: boolean;
  readonly interacting: boolean;
  readonly pending: boolean;
  readonly limited: boolean;
  readonly blocked: boolean;
  readonly slots: readonly FormationSlot[];
  readonly stretched: boolean;
}

export function bindGroupSelectionInput(
  canvas: HTMLCanvasElement,
  toWorld: (point: Point) => Point | null,
  submit: (intent: CommandIntent) => void,
  snapshot: () => Snapshot,
) {
  let draft: PolylineDraft | null = null;
  let mergeMode = false;
  let pointerId: number | null = null;
  let origin: Point = { x: 0, y: 0 };
  let dragged = false;
  let completedLimited = false;
  let blockedFormation = false;
  let pendingSelection: { id: GroupId | null; tick: number } | null = null;
  let pendingFormation: { groupId: GroupId; tick: number; formation: Formation } | null = null;
  let gestureGroup: GroupId | null = null;
  let pressedGroup: GroupId | null = null;
  const effectiveSelection = (state: Snapshot) => {
    if (pendingSelection && state.tick > pendingSelection.tick) pendingSelection = null;
    return pendingSelection ? pendingSelection.id : state.selectedGroupId;
  };
  const select = (id: GroupId | null, tick: number) => {
    pendingSelection = { id, tick };
    if (id === null) pendingFormation = null;
    submit({ type: 'select-group-id', groupId: id });
  };
  const cancel = () => {
    const id = pointerId;
    pointerId = null;
    draft = null;
    if (id !== null && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  };
  const reset = () => {
    cancel();
    completedLimited = false;
    blockedFormation = false;
    mergeMode = false;
    pendingSelection = null;
    pendingFormation = null;
  };
  const down = (event: PointerEvent) => {
    if (event.button !== 0 || !event.isPrimary || pointerId !== null) return;
    const point = toWorld({ x: event.clientX, y: event.clientY });
    if (point === null) return;
    event.preventDefault();
    const state = snapshot();
    blockedFormation = false;
    if (mergeMode) {
      const first = effectiveSelection(state);
      const second = pickGroupAtPoint(state, point, S0_LEVEL.selection);
      if (first && second && first !== second) {
        submit({ type: 'merge', groupId: first, targetGroupId: second });
        pendingFormation = null;
        mergeMode = false;
      }
      return;
    }
    const redGroup = pickGroupAtPoint(state, point, S0_LEVEL.selection, 'red');
    if (!mergeMode && redGroup && !pickGroupAtPoint(state, point, S0_LEVEL.selection)) {
      select(redGroup, state.tick);
      cancel();
      return;
    }
    const selectedGroup = state.groups.find((group) => group.id === effectiveSelection(state));
    if (selectedGroup?.factionId === 'red') {
      if (!pickGroupAtPoint(state, point, S0_LEVEL.selection)) {
        select(null, state.tick);
        return;
      }
      mergeMode = false;
    }
    pressedGroup = pickGroupAtPoint(state, point, S0_LEVEL.selection);
    gestureGroup = pressedGroup ?? effectiveSelection(state);
    if (pressedGroup) select(pressedGroup, state.tick);
    if (gestureGroup === null) return;
    origin = { x: event.clientX, y: event.clientY };
    dragged = false;
    draft = new PolylineDraft(point, DRAWING);
    pointerId = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent) => {
    if (event.pointerId !== pointerId || !draft) return;
    // Browsers may deliver several fast turns in one pointermove. The final
    // sample alone can look like a click, or replace a curve with a short chord.
    const samples = event.getCoalescedEvents?.() ?? [];
    for (const sample of [...samples, event]) {
      const point = toWorld({ x: sample.clientX, y: sample.clientY });
      if (point === null) {
        cancel();
        return;
      }
      dragged ||=
        Math.hypot(sample.clientX - origin.x, sample.clientY - origin.y) >= DRAWING.dragThresholdPx;
      if (dragged) draft.add(point);
    }
  };
  const up = (event: PointerEvent) => {
    if (event.pointerId !== pointerId || !draft) return;
    move(event);
    if (!draft) return;
    if (!dragged) {
      // The intent is latched at pointerdown; moving agents cannot turn a blank click into a hit.
      if (!pressedGroup) select(null, snapshot().tick);
    } else if (draft.valid) {
      const state = snapshot();
      const group = state.groups.find((g) => g.id === gestureGroup);
      const formation = createFormation(draft.points, group?.agentIds ?? []);
      if (
        group &&
        formation &&
        formation.slots.some((slot) => pointBlocked(slot, state.obstacles, UNIT_CLEARANCE))
      ) {
        blockedFormation = true;
      } else if (group && formation) {
        completedLimited = draft.limited;
        pendingFormation = { groupId: group.id, tick: state.tick, formation };
        submit({ type: 'set-formation', groupId: group.id, points: formation.points });
      }
    }
    cancel();
  };
  const splitSelected = () => {
    cancel();
    mergeMode = false;
    const state = snapshot();
    const id = effectiveSelection(state);
    const group = state.groups.find((item) => item.id === id && item.factionId === 'blue');
    if (group && group.agentIds.length > 1) {
      pendingFormation = null;
      submit({ type: 'split', groupId: group.id });
    }
  };
  const key = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      cancel();
      mergeMode = false;
    }
    if (
      (event.code !== 'KeyM' && event.code !== 'KeyX') ||
      event.repeat ||
      event.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      (event.target instanceof HTMLElement &&
        (event.target.isContentEditable || event.target.closest('input, textarea, select')))
    )
      return;
    cancel();
    if (event.code === 'KeyM') mergeMode = !mergeMode;
    else splitSelected();
  };
  const hide = () => {
    if (document.hidden) cancel();
  };
  const pointerCancel = (event: PointerEvent) => {
    if (event.pointerId === pointerId) cancel();
  };
  const lostCapture = (event: PointerEvent) => {
    if (event.pointerId === pointerId && !canvas.hasPointerCapture(event.pointerId)) cancel();
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', pointerCancel);
  canvas.addEventListener('lostpointercapture', lostCapture);
  window.addEventListener('keydown', key);
  window.addEventListener('blur', cancel);
  document.addEventListener('visibilitychange', hide);
  return {
    cancel,
    reset,
    splitSelected,
    toggleMerge() {
      cancel();
      mergeMode = !mergeMode;
    },
    get mergeMode() {
      return mergeMode;
    },
    preview(): DrawingPreview {
      const state = snapshot();
      const selected = effectiveSelection(state);
      if (pendingFormation && state.tick > pendingFormation.tick) pendingFormation = null;
      if (state.selectedGroupId === null && selected === null && pointerId === null) reset();
      const group = state.groups.find(
        (group) => group.id === (draft && dragged ? gestureGroup : selected),
      );
      // Bridge release -> fixed tick without rolling the visible line back to
      // the old plan. This is input preview only; agents still read the snapshot.
      const pending = pendingFormation?.groupId === group?.id ? pendingFormation : null;
      const formation = pending?.formation ?? group?.formation;
      const points =
        draft && dragged && draft.points.length >= 2 ? draft.points : (formation?.points ?? []);
      const provisional = draft && dragged ? createFormation(points, group?.agentIds ?? []) : null;
      return {
        points,
        slots: draft && dragged ? (provisional?.slots ?? []) : (formation?.slots ?? []),
        stretched: provisional
          ? isStretched(provisional, S0_LEVEL.tension)
          : pending
            ? isStretched(pending.formation, S0_LEVEL.tension)
            : false,
        active: draft !== null && dragged,
        interacting: draft !== null,
        pending: pending !== null,
        limited: draft && dragged ? draft.limited : completedLimited,
        blocked: provisional
          ? provisional.slots.some((slot) => pointBlocked(slot, state.obstacles, UNIT_CLEARANCE))
          : blockedFormation,
      };
    },
    dispose() {
      reset();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', pointerCancel);
      canvas.removeEventListener('lostpointercapture', lostCapture);
      window.removeEventListener('keydown', key);
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', hide);
    },
  };
}
