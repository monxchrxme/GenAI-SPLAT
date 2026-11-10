import { Application, Container, Graphics } from 'pixi.js';
import type { AgentId, Point, Snapshot, World } from '../core/types';
import { PRESENTATION as view } from './presentation';
import {
  clientToWorld,
  fitCamera,
  nextCameraPage,
  pageCameraLeft,
  cameraTransition,
} from './viewport';
import type { DrawingPreview } from '../input/groupSelectionInput';
import { tensionActive } from '../core/tension';

export class PixiRenderer {
  private readonly app = new Application();
  private readonly scene = new Container();
  private readonly units = new Container();
  private readonly decor = new Container();
  private readonly paint = new Graphics();
  private tilted = false;
  private readonly selection = new Graphics();
  private readonly line = new Graphics();
  private readonly markers = new Map<AgentId, Graphics>();
  private generation = -1;
  private markerDirty = false;
  private world: Readonly<World> = { width: 1, height: 1 };
  private viewport = { width: 1, height: 1 };
  private cameraScale = 1;
  private cameraLeft = 0;
  private cameraTarget = 0;
  private cameraStart = 0;
  private cameraProgress = 1;
  private cameraFrameTime: number | null = null;
  private manualCameraUntil = 0;

  get canvas(): HTMLCanvasElement {
    return this.app.canvas;
  }

  toWorld(point: Point): Point | null {
    return clientToWorld(
      point,
      this.canvas.getBoundingClientRect(),
      this.viewport,
      this.world,
      view.padding,
      this.tilted ? view.tiltY : 1,
      view.cameraViewWidth,
      this.cameraLeft,
    );
  }

  async init(host: HTMLElement, snapshot: Snapshot): Promise<void> {
    await this.app.init({
      autoStart: false,
      sharedTicker: false,
      preference: 'webgl',
      antialias: true,
      background: view.colors.background,
      resolution: Math.min(window.devicePixelRatio || 1, view.maxResolution),
      autoDensity: true,
      width: 1,
      height: 1,
    });
    this.world = snapshot.world;
    const field = new Graphics()
      .rect(0, 0, this.world.width, this.world.height)
      .fill(view.colors.arena)
      .stroke({ color: view.colors.border, width: 2 });
    const grid = new Graphics();
    for (
      let x = this.world.width / snapshot.paintGrid.columns;
      x < this.world.width;
      x += this.world.width / snapshot.paintGrid.columns
    ) {
      grid.moveTo(x, 0).lineTo(x, this.world.height);
    }
    for (
      let y = this.world.height / snapshot.paintGrid.rows;
      y < this.world.height;
      y += this.world.height / snapshot.paintGrid.rows
    ) {
      grid.moveTo(0, y).lineTo(this.world.width, y);
    }
    grid.stroke({ color: view.colors.grid, width: 1 });
    // [P] Two open flanks and three landmarks: they never obstruct movement or paint.
    const lanes = new Graphics();
    for (const y of view.laneY) {
      lanes.roundRect(500, y - 85, 860, 170, 85).fill({ color: 0xd8ddcf, alpha: 0.22 });
    }
    for (const landmark of view.landmarks) {
      lanes
        .circle(landmark.x, landmark.y, landmark.radius)
        .fill({ color: 0xd8d0bc, alpha: 0.33 })
        .stroke({ color: 0xaaa38f, width: 2, alpha: 0.55 });
      lanes.circle(landmark.x, landmark.y, 8).fill({ color: 0x9a9f8d, alpha: 0.65 });
    }
    this.decor.addChild(lanes);
    const obstacles = new Graphics();
    for (const block of snapshot.obstacles) {
      obstacles
        .rect(block.x, block.y, block.width, block.height)
        .fill({ color: 0x6e8891, alpha: 0.9 })
        .stroke({ color: 0x465e68, width: 3 });
    }
    this.scene.addChild(
      field,
      this.decor,
      this.paint,
      grid,
      obstacles,
      this.line,
      this.selection,
      this.units,
    );
    this.app.stage.addChild(this.scene);
    this.app.canvas.setAttribute('aria-label', 'Поле с синими и красными Сплатами');
    this.app.canvas.setAttribute('role', 'img');
    this.app.canvas.dataset.worldSize = `${this.world.width}×${this.world.height}`;
    host.append(this.app.canvas);
    this.resize(host.clientWidth, host.clientHeight);
  }

  setTilt(tilted: boolean): void {
    this.tilted = tilted;
    this.markerDirty = true;
    this.updateCamera();
  }

  resize(width: number, height: number): void {
    this.viewport = { width: Math.max(1, width), height: Math.max(1, height) };
    this.app.renderer.resize(this.viewport.width, this.viewport.height);
    this.updateCamera();
  }

  private updateCamera(): void {
    const camera = fitCamera(
      this.viewport.width,
      this.viewport.height,
      this.world,
      view.padding,
      view.cameraViewWidth,
      this.cameraLeft,
    );
    this.cameraLeft = camera.left;
    this.cameraScale = camera.scale;
    const tiltY = this.tilted ? view.tiltY : 1;
    this.scene.scale.set(camera.scale, camera.scale * tiltY);
    this.scene.position.set(
      camera.x,
      (this.viewport.height - this.world.height * camera.scale * tiltY) / 2,
    );
  }

  private moveToPage(target: number): void {
    if (target === this.cameraTarget) return;
    this.cameraStart = this.cameraLeft;
    this.cameraTarget = target;
    this.cameraProgress = 0;
  }

  pan(direction: number): void {
    this.moveToPage(
      nextCameraPage(
        this.cameraTarget,
        direction < 0 ? -1 : 1,
        this.world.width,
        view.cameraViewWidth,
        view.cameraPageStep,
      ),
    );
    this.manualCameraUntil = performance.now() + view.cameraManualHoldMs;
  }

  draw(snapshot: Snapshot, restartCount: number, preview?: DrawingPreview): void {
    if (this.generation !== restartCount) {
      this.cameraLeft = 0;
      this.cameraStart = 0;
      this.cameraTarget = 0;
      this.cameraProgress = 1;
      this.cameraFrameTime = null;
      this.manualCameraUntil = 0;
      this.updateCamera();
    }
    const now = performance.now();
    const elapsed =
      this.cameraFrameTime === null ? 0 : Math.min(50, Math.max(0, now - this.cameraFrameTime));
    this.cameraFrameTime = now;
    const following = snapshot.agents.filter(
      (agent) =>
        agent.alive && agent.groupId === snapshot.selectedGroupId && agent.factionId === 'blue',
    );
    // Pausing during a gesture keeps its world-space path attached to the pointer.
    if (!preview?.interacting) {
      if (this.cameraProgress < 1) {
        this.cameraProgress = Math.min(1, this.cameraProgress + elapsed / view.cameraTransitionMs);
        this.cameraLeft = cameraTransition(
          this.cameraStart,
          this.cameraTarget,
          this.cameraProgress,
        );
        this.updateCamera();
      } else if (following.length && now >= this.manualCameraUntil) {
        const meanVelocity = following.reduce((sum, agent) => sum + agent.vx, 0) / following.length;
        const direction = meanVelocity > 0.5 ? 1 : meanVelocity < -0.5 ? -1 : 0;
        const moving = following.filter((agent) => direction * agent.vx > 0.5);
        if (direction !== 0 && moving.length) {
          const edge =
            direction > 0
              ? Math.max(...moving.map((agent) => agent.x))
              : Math.min(...moving.map((agent) => agent.x));
          const next = pageCameraLeft(
            this.cameraTarget,
            edge,
            direction,
            this.world.width,
            view.cameraViewWidth,
            view.cameraPageStep,
            view.cameraEdgeFraction,
          );
          this.moveToPage(next);
        }
      }
    }
    this.canvas.dataset.cameraTarget = String(this.cameraTarget);
    this.canvas.dataset.cameraLeft = String(this.cameraLeft);
    this.paint.clear();
    const columns = snapshot.paintGrid.columns;
    const rows = snapshot.paintGrid.rows;
    const width = snapshot.world.width / columns;
    const height = snapshot.world.height / rows;
    for (const [index, cell] of snapshot.paintCells.entries()) {
      if (cell.control === 0) continue;
      this.paint
        .rect((index % columns) * width, Math.floor(index / columns) * height, width, height)
        .fill({
          color: cell.control > 0 ? view.colors.paintBlue : view.colors.paintRed,
          alpha: 0.12 + Math.abs(cell.control) * 0.25,
        });
    }
    const selected = snapshot.groups.find((group) => group.id === snapshot.selectedGroupId);
    const tension =
      preview?.active || preview?.pending
        ? preview.stretched
        : tensionActive(selected, snapshot.tick);
    const lineColor = tension || preview?.blocked ? view.colors.tension : view.colors.preview;
    this.canvas.dataset.tensionActive = String(tension);
    this.line.clear();
    if (preview && preview.points.length >= 2) {
      const first = preview.points[0]!;
      this.line.moveTo(first.x, first.y);
      for (const point of preview.points.slice(1)) this.line.lineTo(point.x, point.y);
      this.line.stroke({
        color: lineColor,
        width: (tension ? view.tensionStrokeWidth : view.previewStrokeWidth) / this.cameraScale,
        alpha: preview.active ? 0.75 : 1,
      });
    }
    this.canvas.dataset.previewPoints = String(preview?.points.length ?? 0);
    for (const slot of preview?.slots ?? []) {
      this.line
        .circle(slot.x, slot.y, view.slotRadius / this.cameraScale)
        .fill(view.colors.arena)
        .stroke({ color: lineColor, width: view.slotStrokeWidth / this.cameraScale });
    }
    this.canvas.dataset.slotCount = String(preview?.slots.length ?? 0);
    this.canvas.dataset.slotAssignments = (preview?.slots ?? [])
      .map((slot) => `${slot.agentId}:${slot.index}`)
      .join(',');
    this.canvas.dataset.drawing = String(preview?.active ?? false);
    this.canvas.dataset.drawingLimited = String(preview?.limited ?? false);
    if (snapshot.merge) {
      const center = (id: string) => {
        const agents = snapshot.agents.filter((agent) => agent.alive && agent.groupId === id);
        return agents.length
          ? {
              x: agents.reduce((sum, agent) => sum + agent.x, 0) / agents.length,
              y: agents.reduce((sum, agent) => sum + agent.y, 0) / agents.length,
            }
          : null;
      };
      const first = center(snapshot.merge.first),
        second = center(snapshot.merge.second);
      if (first && second)
        this.line
          .moveTo(first.x, first.y)
          .lineTo(second.x, second.y)
          .stroke({
            color: view.colors.selection,
            width: view.previewStrokeWidth / this.cameraScale,
          });
    }
    this.canvas.dataset.merging = String(snapshot.merge !== null);
    this.selection.clear();
    let selectionRingCount = 0;
    if (this.generation !== restartCount || this.markerDirty) {
      this.markerDirty = false;
      for (const child of this.units.removeChildren()) child.destroy();
      this.markers.clear();
      this.generation = restartCount;
    }
    for (const [id, marker] of this.markers) {
      if (!snapshot.agents.some((agent) => agent.id === id && agent.alive)) {
        this.units.removeChild(marker);
        marker.destroy();
        this.markers.delete(id);
      }
    }
    for (const agent of snapshot.agents) {
      if (!agent.alive) continue;
      let marker = this.markers.get(agent.id);
      if (!marker) {
        marker = new Graphics()
          .ellipse(0, view.shadowOffset, view.markerRadius, view.markerRadius * view.shadowScaleY)
          .fill({ color: view.colors.shadow, alpha: 0.12 });
        if (this.tilted) {
          marker
            .moveTo(-11, 2)
            .bezierCurveTo(-12, -7, -6, -11, 0, -10)
            .bezierCurveTo(7, -12, 12, -6, 11, 2)
            .bezierCurveTo(10, 10, 6, 11, 0, 10)
            .bezierCurveTo(-6, 11, -10, 8, -11, 2)
            .closePath()
            .fill(agent.factionId === 'blue' ? view.colors.blue : view.colors.red)
            .stroke({
              color: agent.factionId === 'blue' ? view.colors.blueEdge : view.colors.redEdge,
              width: 1,
            });
        } else {
          marker
            .circle(0, 0, view.markerRadius)
            .fill(agent.factionId === 'blue' ? view.colors.blue : view.colors.red)
            .stroke({
              color: agent.factionId === 'blue' ? view.colors.blueEdge : view.colors.redEdge,
              width: 1,
            });
        }
        marker
          .circle(view.highlightOffset, view.highlightOffset, view.highlightRadius)
          .fill({ color: view.colors.highlight, alpha: 0.7 });
        marker.scale.y = this.tilted ? 1 / view.tiltY : 1;
        this.units.addChild(marker);
        this.markers.set(agent.id, marker);
      }
      // B-static: position changes; a short opacity cue indicates a hit.
      marker.position.set(agent.x, agent.y);
      marker.alpha = (agent.hitUntilTick ?? 0) > snapshot.tick ? 0.5 : 1;
      if (
        snapshot.selectedGroupId === agent.groupId ||
        snapshot.groups.some(
          (group) =>
            group.id === agent.groupId && (group.mergeHighlightUntilTick ?? 0) > snapshot.tick,
        )
      ) {
        this.selection.circle(agent.x, agent.y, view.markerRadius + view.selectionPadding);
        selectionRingCount++;
      }
    }
    if (selectionRingCount > 0) {
      this.selection.stroke({
        color: view.colors.selection,
        width: view.selectionStrokeWidth / this.cameraScale,
      });
    }
    this.app.canvas.dataset.markerCount = String(this.markers.size);
    const sceneLeft = this.scene.position.x;
    this.canvas.dataset.blueHealth = String(
      snapshot.agents
        .filter((agent) => agent.alive && agent.factionId === 'blue')
        .reduce((sum, agent) => sum + agent.hp, 0),
    );
    this.canvas.dataset.visibleSelectedCount = String(
      following.filter(
        (agent) =>
          sceneLeft + agent.x * this.cameraScale >= 0 &&
          sceneLeft + agent.x * this.cameraScale <= this.viewport.width,
      ).length,
    );
    this.canvas.dataset.visibleRedCount = String(
      snapshot.agents.filter(
        (agent) =>
          agent.alive &&
          agent.factionId === 'red' &&
          sceneLeft + agent.x * this.cameraScale >= 0 &&
          sceneLeft + agent.x * this.cameraScale <= this.viewport.width,
      ).length,
    );
    this.app.canvas.dataset.redGroupCount = String(
      snapshot.groups.filter((group) => group.factionId === 'red').length,
    );
    this.app.canvas.dataset.redCount = String(
      snapshot.agents.filter((a) => a.alive && a.factionId === 'red').length,
    );
    this.canvas.dataset.movingCount = String(
      snapshot.agents.filter((a) => a.factionId === 'blue' && (a.vx !== 0 || a.vy !== 0)).length,
    );
    const agents = new Map(snapshot.agents.map((a) => [a.id, a]));
    this.canvas.dataset.maxSlotError = String(
      Math.max(
        0,
        ...snapshot.groups
          .filter((group) => group.factionId === 'blue')
          .flatMap(
            (g) =>
              g.formation?.slots.map((s) => {
                const a = agents.get(s.agentId)!;
                return Math.hypot(s.x - a.x, s.y - a.y);
              }) ?? [],
          ),
      ),
    );
    this.canvas.dataset.previewPath = JSON.stringify(preview?.points ?? []);
    this.canvas.dataset.formationPath = JSON.stringify(selected?.formation?.points ?? []);
    this.app.canvas.dataset.tick = String(snapshot.tick);
    this.app.canvas.dataset.restartCount = String(restartCount);
    this.app.canvas.dataset.selectedGroup = snapshot.selectedGroupId ?? '';
    this.app.canvas.dataset.selectionRingCount = String(selectionRingCount);
    this.app.render();
  }

  destroy(): void {
    this.app.destroy(true, { children: true });
  }
}
