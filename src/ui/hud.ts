import type { Snapshot } from '../core/types';

export class Hud {
  constructor(
    private readonly agentCount: HTMLElement,
    private readonly groupCount: HTMLElement,
  ) {}

  draw(snapshot: Snapshot): void {
    this.agentCount.textContent = String(snapshot.agents.filter((agent) => agent.alive).length);
    this.groupCount.textContent = String(snapshot.groups.length);
  }
}
