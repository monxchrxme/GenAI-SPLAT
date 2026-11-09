import type { GameCommand, GroupId, LevelConfig, MatchState, Snapshot } from '../core/types';
import { advanceMerge, startMerge } from './merge';
import { splitFormation } from './split';
import { createInitialState } from './initialState';
import { assertInvariants } from './invariants';
import { createSnapshot } from './snapshot';
import { pickGroupAtPoint } from './selection';
import { createFormation } from '../core/formation';
import { moveAgents, validateMovement } from './movement';
import { isStretched, validateTension } from '../core/tension';

export class Simulation {
  private readonly state: MatchState;
  private nextGroupId = 2;

  constructor(private readonly config: LevelConfig) {
    validateMovement(config);
    if (!Number.isFinite(config.mergeDistance) || config.mergeDistance <= 0)
      throw new Error('Invalid merge distance');
    validateTension(config.tension);
    if (!Number.isSafeInteger(config.mergeHighlightTicks) || config.mergeHighlightTicks < 1)
      throw new Error('Invalid merge highlight');
    if (
      !Number.isFinite(config.selection.hitRadius) ||
      config.selection.hitRadius <= 0 ||
      !Number.isFinite(config.selection.neighborDistance) ||
      config.selection.neighborDistance <= 0
    ) {
      throw new Error('Invalid selection radius or neighbor distance');
    }
    this.state = createInitialState(config);
    assertInvariants(this.state);
  }

  step(commands: readonly GameCommand[] = []): void {
    for (const command of commands) {
      if (command.tick !== this.state.tick) continue;
      if (command.type === 'select-group-id') {
        if (
          command.groupId === null ||
          this.state.groups.some(
            (g) => g.id === command.groupId && g.factionId === 'blue' && g.agentIds.length > 0,
          )
        )
          this.select(command.groupId);
        continue;
      }
      if (command.type === 'merge') {
        startMerge(this.state, command.groupId, command.targetGroupId);
        continue;
      }
      if (command.type === 'cut') {
        const group = this.state.groups.find((g) => g.id === command.groupId);
        if (
          !group ||
          group.id !== this.state.selectedGroupId ||
          !group.formation ||
          command.points.some(
            (p) =>
              p.x < 0 || p.y < 0 || p.x > this.state.world.width || p.y > this.state.world.height,
          )
        )
          continue;
        if (
          this.state.merge &&
          [this.state.merge.first, this.state.merge.second].includes(group.id)
        )
          continue;
        const parts = splitFormation(group.formation, command.points);
        if (!parts) continue;
        const groups = parts.map((formation) => ({
          id: `group-${this.nextGroupId++}` as GroupId,
          factionId: group.factionId,
          agentIds: formation.slots.map((slot) => slot.agentId),
          formation,
        }));
        this.state.groups.splice(this.state.groups.indexOf(group), 1, ...groups);
        for (const agent of this.state.agents) {
          const owner = groups.find((g) => g.agentIds.includes(agent.id));
          if (owner) agent.groupId = owner.id;
        }
        this.state.selectedGroupId = groups[0]!.id;
        continue;
      }
      if (command.type === 'set-formation') {
        const group = this.state.groups.find((group) => group.id === command.groupId);
        if (
          !group ||
          group.id !== this.state.selectedGroupId ||
          command.points.some(
            (p) =>
              p.x < 0 || p.y < 0 || p.x > this.state.world.width || p.y > this.state.world.height,
          )
        )
          continue;
        const formation = createFormation(command.points, group.agentIds);
        if (formation) {
          if (
            this.state.merge &&
            [this.state.merge.first, this.state.merge.second].includes(group.id)
          )
            this.state.merge = null;
          group.formation = formation;
          if (isStretched(formation, this.config.tension)) {
            // The first published snapshot starts a full duration of fixed ticks.
            group.tensionUntilTick = this.state.tick + 1 + this.config.tension.durationTicks;
          } else delete group.tensionUntilTick;
        }
        continue;
      }
      if (command.type !== 'select-group') continue;
      const { x, y } = command.point;
      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        x < 0 ||
        y < 0 ||
        x > this.state.world.width ||
        y > this.state.world.height
      )
        continue;
      const selected = pickGroupAtPoint(this.state, command.point, this.config.selection);
      this.select(selected);
    }
    const targets = advanceMerge(
      this.state,
      this.config.mergeDistance,
      this.config.mergeHighlightTicks,
    );
    moveAgents(this.state, this.config, targets);
    this.state.tick++;
  }

  private select(selected: GroupId | null): void {
    if (selected === null) {
      if (
        this.state.merge &&
        this.state.selectedGroupId &&
        [this.state.merge.first, this.state.merge.second].includes(this.state.selectedGroupId)
      )
        this.state.merge = null;
      const previous = this.state.groups.find((group) => group.id === this.state.selectedGroupId);
      if (previous) {
        delete previous.formation;
        delete previous.tensionUntilTick;
      }
    }
    this.state.selectedGroupId = selected;
  }

  get tick(): number {
    return this.state.tick;
  }

  getSnapshot(): Snapshot {
    return createSnapshot(this.state);
  }
}
