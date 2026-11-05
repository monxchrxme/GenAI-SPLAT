import { Application, Container, Graphics } from 'pixi.js';
import type { AgentId, Snapshot, World } from '../core/types';
import { PRESENTATION as view } from './presentation';
import { fitWorld } from './viewport';

export class PixiRenderer {
  private readonly app = new Application();
  private readonly scene = new Container();
  private readonly units = new Container();
  private readonly markers = new Map<AgentId, Graphics>();
  private generation = -1;
  private world: Readonly<World> = { width: 1, height: 1 };

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
    for (let x = view.gridSpacing; x < this.world.width; x += view.gridSpacing) {
      grid.moveTo(x, 0).lineTo(x, this.world.height);
    }
    for (let y = view.gridSpacing; y < this.world.height; y += view.gridSpacing) {
      grid.moveTo(0, y).lineTo(this.world.width, y);
    }
    grid.stroke({ color: view.colors.grid, width: 1 });
    // This grid is visual only; there is no territory or paint model in S0.
    this.scene.addChild(field, grid, this.units);
    this.app.stage.addChild(this.scene);
    this.app.canvas.setAttribute('aria-label', 'Поле с 40 синими статичными маркерами');
    this.app.canvas.setAttribute('role', 'img');
    this.app.canvas.dataset.worldSize = `${this.world.width}×${this.world.height}`;
    host.append(this.app.canvas);
    this.resize(host.clientWidth, host.clientHeight);
  }

  resize(width: number, height: number): void {
    this.app.renderer.resize(Math.max(1, width), Math.max(1, height));
    const camera = fitWorld(width, height, this.world, view.padding);
    this.scene.scale.set(camera.scale);
    this.scene.position.set(camera.x, camera.y);
  }

  draw(snapshot: Snapshot, restartCount: number): void {
    if (this.generation !== restartCount) {
      for (const child of this.units.removeChildren()) child.destroy();
      this.markers.clear();
      this.generation = restartCount;
    }
    for (const agent of snapshot.agents) {
      if (!agent.alive) continue;
      let marker = this.markers.get(agent.id);
      if (!marker) {
        marker = new Graphics()
          .ellipse(0, view.shadowOffset, view.markerRadius, view.markerRadius * view.shadowScaleY)
          .fill({ color: view.colors.shadow, alpha: 0.12 })
          .circle(0, 0, view.markerRadius)
          .fill(view.colors.blue)
          .stroke({ color: view.colors.blueEdge, width: 1 })
          .circle(view.highlightOffset, view.highlightOffset, view.highlightRadius)
          .fill({ color: view.colors.highlight, alpha: 0.7 });
        this.units.addChild(marker);
        this.markers.set(agent.id, marker);
      }
      // B-static: only position is written; shape, rotation and scale stay fixed.
      marker.position.set(agent.x, agent.y);
    }
    this.app.canvas.dataset.markerCount = String(this.markers.size);
    this.app.canvas.dataset.tick = String(snapshot.tick);
    this.app.canvas.dataset.restartCount = String(restartCount);
    this.app.render();
  }

  destroy(): void {
    this.app.destroy(true, { children: true });
  }
}
