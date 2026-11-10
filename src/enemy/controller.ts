import type { GameCommand, GroupId, LevelConfig, Point, Snapshot } from '../core/types';

type LiveAgent = Snapshot['agents'][number];
const centerOf = (agents: readonly LiveAgent[]): Point => ({
  x: agents.reduce((sum, agent) => sum + agent.x, 0) / agents.length,
  y: agents.reduce((sum, agent) => sum + agent.y, 0) / agents.length,
});
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

// [P] Controller emits fixed-tick commands. Two squads deploy against separated
// fronts and converge before merging; a defensive leash avoids suicidal pursuit.
export function enemyCommands(state: Snapshot, config: LevelConfig): GameCommand[] {
  const enemy = config.enemy;
  if (!enemy || state.tick % enemy.decisionTicks !== 0) return [];
  const reds = state.groups.filter((group) => group.factionId === 'red');
  if (reds.length === 0) return [];
  const blue = state.agents.filter((agent) => agent.alive && agent.factionId === 'blue');
  const blueGroups = state.groups
    .filter((group) => group.factionId === 'blue')
    .map((group) => blue.filter((agent) => agent.groupId === group.id))
    .filter((agents) => agents.length > 0);
  const fronts: Point[] = blueGroups.map(centerOf);
  let stretched = false;
  // A single stretched formation can also create two fronts.
  if (fronts.length === 1 && blue.length > 1) {
    const xSorted = [...blue].sort(
      (a, b) => a.x - b.x || Number(a.id.slice(6)) - Number(b.id.slice(6)),
    );
    const ySorted = [...blue].sort(
      (a, b) => a.y - b.y || Number(a.id.slice(6)) - Number(b.id.slice(6)),
    );
    const sorted =
      xSorted.at(-1)!.x - xSorted[0]!.x > ySorted.at(-1)!.y - ySorted[0]!.y ? xSorted : ySorted;
    if (distance(sorted[0]!, sorted.at(-1)!) >= enemy.splitDistance) {
      stretched = true;
      const mid = Math.floor(sorted.length / 2);
      fronts.splice(0, 1, centerOf(sorted.slice(0, mid)), centerOf(sorted.slice(mid)));
    }
  }
  const separate =
    stretched ||
    (fronts.length >= 2 &&
      fronts.some((front, index) =>
        fronts.slice(index + 1).some((other) => distance(front, other) >= enemy.splitDistance),
      ));
  if (reds.length === 1 && separate && reds[0]!.agentIds.length >= enemy.minSquadSize * 2)
    return [{ type: 'enemy-split', tick: state.tick, groupId: reds[0]!.id }];

  const redAgents = (id: GroupId) =>
    state.agents.filter((agent) => agent.alive && agent.groupId === id);
  const centers = reds.map((group) => centerOf(redAgents(group.id)));
  if (reds.length === 2 && !separate && distance(centers[0]!, centers[1]!) <= config.mergeDistance)
    return [{ type: 'enemy-merge', tick: state.tick, first: reds[0]!.id, second: reds[1]!.id }];

  const makeFormation = (groupId: GroupId, point: Point): GameCommand => {
    const x = Math.max(60, Math.min(state.world.width - 60, point.x));
    const y = Math.max(48, Math.min(state.world.height - 48, point.y));
    const points: Point[] = [];
    for (let row = 0; row < 4; row++) {
      const left = { x: x - 60, y: y - 36 + row * 24 };
      const right = { x: x + 60, y: y - 36 + row * 24 };
      points.push(...(row % 2 === 0 ? [left, right] : [right, left]));
    }
    return { type: 'enemy-formation', tick: state.tick, groupId, points };
  };
  const retreatX = enemy.centerX - enemy.advanceDistance;
  const mergeCenter =
    reds.length === 2 && !separate
      ? { x: (centers[0]!.x + centers[1]!.x) / 2, y: (centers[0]!.y + centers[1]!.y) / 2 }
      : null;
  return reds.map((group, index) => {
    if (mergeCenter) return makeFormation(group.id, mergeCenter);
    const center = centers[index]!;
    const targetFront =
      fronts.length >= 2 && reds.length === 2 && separate
        ? distance(centers[0]!, fronts[0]!) + distance(centers[1]!, fronts[1]!) <=
          distance(centers[0]!, fronts[1]!) + distance(centers[1]!, fronts[0]!)
          ? fronts[index]!
          : fronts[1 - index]!
        : fronts.length
          ? [...fronts].sort((a, b) => distance(a, center) - distance(b, center))[0]!
          : null;
    const nearbyBlue = blue.filter((agent) => distance(agent, center) <= enemy.threatRadius);
    const disadvantaged = nearbyBlue.length > group.agentIds.length * enemy.disadvantageRatio;
    let target: Point = {
      x: retreatX,
      y:
        separate && reds.length === 2 && enemy.guardLanes
          ? enemy.guardLanes[index]!
          : separate && fronts.length > 1
            ? (targetFront?.y ?? enemy.centerY)
            : enemy.centerY,
    };
    if (targetFront && distance(targetFront, center) <= enemy.threatRadius && !disadvantaged) {
      target = { x: Math.max(enemy.centerX - enemy.defenseDepth, targetFront.x), y: targetFront.y };
    }
    return makeFormation(group.id, target);
  });
}
