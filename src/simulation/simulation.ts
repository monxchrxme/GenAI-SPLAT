import type { GameCommand, GroupId, LevelConfig, MatchState, Snapshot } from '../core/types';
import { enemyCommands } from '../enemy/controller';
import { resolveCombat } from './combat';
import { updatePaint, validatePaint } from './paint';
import { advanceMerge, startMerge } from './merge';
import { splitFormation } from './split';
import { createInitialState } from './initialState';
import { assertInvariants } from './invariants';
import { createSnapshot } from './snapshot';
import { pickGroupAtPoint } from './selection';
import { createFormation } from '../core/formation';
import { moveAgents, validateMovement, type RouteCache } from './movement';
import { pointBlocked, UNIT_CLEARANCE } from './obstacles';
import { groupMoveFormation } from './groupMove';
import { objectiveCells, updateObjective } from './objective';
import { updateHazards } from './hazards';
import { isStretched, validateTension } from '../core/tension';

export class Simulation {
  private readonly state: MatchState;
  private nextGroupId = 2;
  private nextAgentId: number;
  private readonly routes: RouteCache = new Map();

  constructor(private readonly config: LevelConfig) {
    validateMovement(config);
    validatePaint(config.paint);
    for (const obstacle of [...(config.obstacles ?? []), ...(config.shorePonds ?? [])]) {
      if (
        ![obstacle.x, obstacle.y, obstacle.width, obstacle.height].every(Number.isFinite) ||
        obstacle.x < 0 ||
        obstacle.y < 0 ||
        obstacle.width <= 0 ||
        obstacle.height <= 0 ||
        obstacle.x + obstacle.width > config.world.width ||
        obstacle.y + obstacle.height > config.world.height
      )
        throw new Error('Invalid obstacle');
    }
    const enemy = config.enemy;
    const combat = config.combat;
    for (const generated of [config.ponds, config.randomWalls]) {
      if (
        generated &&
        (!Number.isSafeInteger(generated.count) ||
          generated.count < 0 ||
          generated.count > generated.candidates.length ||
          generated.candidates.some(
            (r) =>
              ![r.x, r.y, r.width, r.height].every(Number.isFinite) ||
              r.x < 0 ||
              r.y < 0 ||
              r.width <= 0 ||
              r.height <= 0 ||
              r.x + r.width > config.world.width ||
              r.y + r.height > config.world.height,
          ))
      )
        throw new Error('Invalid generated obstacles');
    }
    if (config.hazards) {
      const h = config.hazards;
      if (
        !Number.isSafeInteger(h.mineCount) ||
        h.mineCount < 0 ||
        h.mineCount > h.mines.length ||
        !Number.isSafeInteger(h.minePaintCells) ||
        h.minePaintCells < 0 ||
        ![
          h.slowRadius,
          h.slowFactor,
          h.mineRadius,
          h.mineDamage,
          h.cannonRange,
          h.cannonDamage,
          h.cannonCooldown,
          h.cannonSweepTicks,
          h.cannonProjectileSpeed,
          h.cannonHitRadius,
        ].every((n) => Number.isFinite(n) && n > 0) ||
        h.slowFactor > 1 ||
        h.slow.some(
          (point) =>
            point.radius !== undefined && (!Number.isFinite(point.radius) || point.radius <= 0),
        ) ||
        !Number.isSafeInteger(h.cannonCooldown) ||
        !Number.isSafeInteger(h.cannonSweepTicks) ||
        [...h.slow, ...h.mines, ...h.cannons].some(
          (p) =>
            !Number.isFinite(p.x) ||
            !Number.isFinite(p.y) ||
            p.x < 0 ||
            p.x > config.world.width ||
            p.y < 0 ||
            p.y > config.world.height,
        )
      )
        throw new Error('Invalid hazards');
    }
    const checkpoints = config.checkpoints ?? [];
    if (checkpoints.length && !config.objective)
      throw new Error('Checkpoints need a final objective');
    let previousBoundary = 0;
    for (const { area, viewEnd } of checkpoints) {
      if (
        area.x < previousBoundary ||
        (viewEnd !== undefined &&
          (!Number.isFinite(viewEnd) ||
            viewEnd < area.x + area.width ||
            viewEnd > config.world.width))
      )
        throw new Error('Invalid checkpoint view boundary');
      previousBoundary = viewEnd ?? area.x + area.width;
    }
    for (const area of [...checkpoints.map((point) => point.area), config.objective]) {
      if (
        area &&
        (![area.x, area.y, area.width, area.height].every(Number.isFinite) ||
          area.x < 0 ||
          area.y < 0 ||
          area.width <= 0 ||
          area.height <= 0 ||
          area.x + area.width > config.world.width ||
          area.y + area.height > config.world.height)
      )
        throw new Error('Invalid objective');
    }
    if (
      config.enemyPosts &&
      (!enemy ||
        config.enemyPosts.length === 0 ||
        config.enemyPosts.some(
          (post) =>
            !Number.isSafeInteger(post.count) ||
            post.count < 1 ||
            !Number.isSafeInteger(post.columns) ||
            post.columns < 1 ||
            !Number.isFinite(post.centerX) ||
            !Number.isFinite(post.centerY) ||
            post.centerX < 0 ||
            post.centerX > config.world.width ||
            post.centerY < 0 ||
            post.centerY > config.world.height ||
            (post.localDefense !== undefined &&
              (!Number.isFinite(post.localDefense.radius) ||
                !Number.isFinite(post.localDefense.leash) ||
                post.localDefense.leash <= 0 ||
                post.localDefense.radius < post.localDefense.leash)),
        ))
    )
      throw new Error('Invalid enemy posts');
    if (
      enemy &&
      (!Number.isSafeInteger(enemy.count) ||
        enemy.count < 1 ||
        !Number.isSafeInteger(enemy.columns) ||
        enemy.columns < 1 ||
        !Number.isSafeInteger(enemy.decisionTicks) ||
        enemy.decisionTicks < 1 ||
        ![
          enemy.centerX,
          enemy.centerY,
          enemy.spacing,
          enemy.threatRadius,
          enemy.advanceDistance,
        ].every(Number.isFinite) ||
        enemy.spacing <= 0 ||
        enemy.threatRadius <= 0 ||
        enemy.advanceDistance < 0 ||
        !Number.isFinite(enemy.splitDistance) ||
        enemy.splitDistance <= 0 ||
        !Number.isSafeInteger(enemy.minSquadSize) ||
        enemy.minSquadSize < 1 ||
        !Number.isFinite(enemy.defenseDepth) ||
        enemy.defenseDepth <= 0 ||
        !Number.isFinite(enemy.disadvantageRatio) ||
        enemy.disadvantageRatio <= 0 ||
        (enemy.guardLanes !== undefined &&
          enemy.guardLanes.some(
            (lane) => !Number.isFinite(lane) || lane < 0 || lane > config.world.height,
          )))
    )
      throw new Error('Invalid enemy configuration');
    if (
      combat &&
      (!Number.isFinite(combat.range) ||
        combat.range <= 0 ||
        !Number.isFinite(combat.damage) ||
        combat.damage <= 0 ||
        !Number.isSafeInteger(combat.cooldownTicks) ||
        combat.cooldownTicks < 1 ||
        !Number.isSafeInteger(combat.hitFeedbackTicks) ||
        combat.hitFeedbackTicks < 1)
    )
      throw new Error('Invalid combat configuration');
    if (
      !Number.isFinite(config.victoryFraction) ||
      config.victoryFraction <= 0 ||
      config.victoryFraction > 1
    )
      throw new Error('Invalid victory fraction');
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
    const reinforcement = config.reinforcement;
    if (
      reinforcement &&
      (![
        reinforcement.cost,
        reinforcement.count,
        reinforcement.maxBlue,
        reinforcement.deviantReward ?? 1,
      ].every((n) => Number.isSafeInteger(n) && n > 0) ||
        reinforcement.maxBlue < config.spawn.count)
    )
      throw new Error('Invalid reinforcement configuration');
    this.state = createInitialState(config);
    const assignedCells = new Set();
    for (const objective of [...this.state.checkpoints, this.state.objective]) {
      if (!objective) continue;
      const cells = objectiveCells(this.state, objective.area);
      if (!cells.length || cells.some((cell) => cell.blocked))
        throw new Error('Invalid objective cells');
      for (const cell of cells) {
        if (assignedCells.has(cell)) throw new Error('Objectives must occupy different cells');
        assignedCells.add(cell);
      }
    }
    this.nextAgentId = Math.max(...this.state.agents.map((agent) => Number(agent.id.slice(6)))) + 1;
    assertInvariants(this.state);
    if (
      this.state.paintCells.every((cell) => cell.blocked) ||
      this.state.agents.some((agent) => pointBlocked(agent, this.state.obstacles, UNIT_CLEARANCE))
    )
      throw new Error('Invalid accessible arena');
  }

  step(commands: readonly GameCommand[] = []): void {
    if (this.state.phase === 'finished') return;
    for (const command of [...commands, ...enemyCommands(this.state, this.config)]) {
      if (command.tick !== this.state.tick) continue;
      if (command.type === 'enemy-split') {
        const group = this.state.groups.find(
          (item) => item.id === command.groupId && item.factionId === 'red',
        );
        if (
          !group ||
          !this.config.enemy ||
          group.agentIds.length < this.config.enemy.minSquadSize * 2 ||
          this.state.groups.filter(
            (item) => item.factionId === 'red' && item.enemyPost === group.enemyPost,
          ).length !== 1
        )
          continue;
        const members = this.state.agents
          .filter((agent) => agent.alive && agent.groupId === group.id)
          .sort((a, b) => a.y - b.y || Number(a.id.slice(6)) - Number(b.id.slice(6)));
        const midpoint = Math.floor(members.length / 2);
        const parts = [members.slice(0, midpoint), members.slice(midpoint)].map((agents) => ({
          id: this.allocateGroupId(),
          factionId: 'red' as const,
          agentIds: agents.map((agent) => agent.id),
          ...(group.enemyPost === undefined ? {} : { enemyPost: group.enemyPost }),
        }));
        this.state.groups.splice(this.state.groups.indexOf(group), 1, ...parts);
        for (const part of parts)
          for (const agent of members)
            if (part.agentIds.includes(agent.id)) agent.groupId = part.id;
        if (this.state.selectedGroupId === group.id) this.state.selectedGroupId = parts[0]!.id;
        continue;
      }
      if (command.type === 'enemy-merge') {
        const first = this.state.groups.find(
          (group) => group.id === command.first && group.factionId === 'red',
        );
        const second = this.state.groups.find(
          (group) => group.id === command.second && group.factionId === 'red',
        );
        if (!first || !second || first.id === second.id || first.enemyPost !== second.enemyPost)
          continue;
        const agents = (id: GroupId) =>
          this.state.agents.filter((agent) => agent.alive && agent.groupId === id);
        const center = (id: GroupId) => {
          const members = agents(id);
          return {
            x: members.reduce((sum, agent) => sum + agent.x, 0) / members.length,
            y: members.reduce((sum, agent) => sum + agent.y, 0) / members.length,
          };
        };
        const a = center(first.id),
          b = center(second.id);
        if (Math.hypot(a.x - b.x, a.y - b.y) > this.config.mergeDistance) continue;
        first.agentIds.push(...second.agentIds);
        delete first.formation;
        for (const agent of agents(second.id)) agent.groupId = first.id;
        this.state.groups.splice(this.state.groups.indexOf(second), 1);
        if (this.state.selectedGroupId === second.id) this.state.selectedGroupId = first.id;
        continue;
      }
      if (command.type === 'enemy-formation') {
        const group = this.state.groups.find(
          (item) => item.id === command.groupId && item.factionId === 'red',
        );
        if (group) {
          const formation = createFormation(command.points, group.agentIds);
          if (formation) group.formation = formation;
        }
        continue;
      }
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
      if (command.type === 'reinforce') {
        const settings = this.config.reinforcement;
        const group = this.state.groups.find(
          (item) => item.id === command.groupId && item.factionId === 'blue',
        );
        const current = this.state.agents.filter(
          (agent) => agent.alive && agent.factionId === 'blue',
        ).length;
        if (
          !settings ||
          !group ||
          group.id !== this.state.selectedGroupId ||
          this.state.reinforcementCredits < settings.cost ||
          current >= settings.maxBlue
        )
          continue;
        const desired = Math.min(settings.count, settings.maxBlue - current);
        const members = this.state.agents.filter(
          (agent) => agent.alive && agent.groupId === group.id,
        );
        const occupied = this.state.agents
          .filter((agent) => agent.alive)
          .map((agent) => ({ x: agent.x, y: agent.y }));
        const positions: { x: number; y: number }[] = [];
        // Stable search around living group members; never place inside obstacles.
        for (const member of members) {
          for (let radius = 24; radius <= 192 && positions.length < desired; radius += 24) {
            for (let dx = -radius; dx <= radius && positions.length < desired; dx += 24) {
              for (let dy = -radius; dy <= radius && positions.length < desired; dy += 24) {
                if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                const point = { x: member.x + dx, y: member.y + dy };
                if (
                  point.x < 0 ||
                  point.y < 0 ||
                  point.x > this.state.world.width ||
                  point.y > this.state.world.height ||
                  pointBlocked(point, this.state.obstacles, UNIT_CLEARANCE) ||
                  occupied.some((other) => Math.hypot(other.x - point.x, other.y - point.y) < 20)
                )
                  continue;
                positions.push(point);
                occupied.push(point);
              }
            }
          }
          if (positions.length === desired) break;
        }
        if (!positions.length) continue;
        this.state.reinforcementCredits -= settings.cost;
        for (const point of positions) {
          const id = `agent-${this.nextAgentId++}` as const;
          this.state.agents.push({
            id,
            factionId: 'blue',
            groupId: group.id,
            x: point.x,
            y: point.y,
            vx: 0,
            vy: 0,
            hp: this.config.initialHp,
            alive: true,
          });
          group.agentIds.push(id);
          if (group.formation)
            group.formation.slots.push({
              ...point,
              agentId: id,
              index: group.formation.slots.length,
            });
        }
        continue;
      }
      if (command.type === 'split') {
        const group = this.state.groups.find(
          (item) => item.id === command.groupId && item.factionId === 'blue',
        );
        if (
          !group ||
          group.id !== this.state.selectedGroupId ||
          group.agentIds.length < 2 ||
          (this.state.merge && [this.state.merge.first, this.state.merge.second].includes(group.id))
        )
          continue;
        const ordered =
          group.formation?.slots.map((slot) => slot.agentId) ??
          [...group.agentIds].sort((a, b) => {
            const first = this.state.agents.find((agent) => agent.id === a)!;
            const second = this.state.agents.find((agent) => agent.id === b)!;
            return (
              first.x - second.x || first.y - second.y || Number(a.slice(6)) - Number(b.slice(6))
            );
          });
        const midpoint = Math.ceil(ordered.length / 2);
        const parts = [ordered.slice(0, midpoint), ordered.slice(midpoint)].map((ids) => {
          const slots = group.formation?.slots
            .filter((slot) => ids.includes(slot.agentId))
            .map((slot, index) => ({ ...slot, index }));
          return {
            id: this.allocateGroupId(),
            factionId: group.factionId,
            agentIds: ids,
            ...(slots && group.formation
              ? {
                  formation: {
                    points: slots.map((slot) => ({ x: slot.x, y: slot.y })),
                    slots,
                  },
                }
              : {}),
          };
        });
        this.state.groups.splice(this.state.groups.indexOf(group), 1, ...parts);
        for (const part of parts)
          for (const agent of this.state.agents)
            if (part.agentIds.includes(agent.id)) agent.groupId = part.id;
        this.state.selectedGroupId = parts[0]!.id;
        continue;
      }
      if (command.type === 'cut') {
        const group = this.state.groups.find((g) => g.id === command.groupId);
        if (
          !group ||
          group.factionId !== 'blue' ||
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
          id: this.allocateGroupId(),
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
      if (command.type === 'move-group') {
        const group = this.state.groups.find(
          (item) => item.id === command.groupId && item.factionId === 'blue',
        );
        if (!group || group.id !== this.state.selectedGroupId) continue;
        const formation = groupMoveFormation(this.state, group.id, command.point);
        if (!formation) continue;
        if (
          this.state.merge &&
          [this.state.merge.first, this.state.merge.second].includes(group.id)
        )
          this.state.merge = null;
        group.formation = formation;
        delete group.tensionUntilTick;
        continue;
      }
      if (command.type === 'set-formation') {
        const group = this.state.groups.find((group) => group.id === command.groupId);
        if (
          !group ||
          group.factionId !== 'blue' ||
          group.id !== this.state.selectedGroupId ||
          command.points.some(
            (p) =>
              p.x < 0 || p.y < 0 || p.x > this.state.world.width || p.y > this.state.world.height,
          )
        )
          continue;
        const formation = createFormation(command.points, group.agentIds);
        if (
          formation &&
          formation.slots.every((slot) => !pointBlocked(slot, this.state.obstacles, UNIT_CLEARANCE))
        ) {
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
    moveAgents(this.state, this.config, targets, this.routes);
    resolveCombat(this.state, this.config);
    updatePaint(this.state, this.config);
    updateHazards(this.state, this.config);
    updateObjective(this.state);
    this.state.tick++;
    if (
      this.config.combat &&
      !this.state.agents.some((agent) => agent.alive && agent.factionId === 'blue')
    ) {
      this.state.phase = 'finished';
      this.state.result = 'defeat';
    } else if (this.hasWon()) {
      this.state.phase = 'finished';
      this.state.result = 'victory';
    }
  }

  private hasWon(): boolean {
    const { checkpoints, objective, paintCells } = this.state;
    if (checkpoints.length)
      return checkpoints.every((point) => point.captured) && objective?.captured === true;
    if (objective && !objective.captured) return false;
    const accessible = paintCells.filter((cell) => !cell.blocked);
    return (
      accessible.filter((cell) => cell.owner === 'blue').length / accessible.length >=
      this.config.victoryFraction
    );
  }

  private allocateGroupId(): GroupId {
    while (
      (this.config.enemy && this.nextGroupId === 1000) ||
      this.state.groups.some((group) => group.id === `group-${this.nextGroupId}`)
    )
      this.nextGroupId++;
    return `group-${this.nextGroupId++}`;
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
      if (previous?.factionId === 'blue') {
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
