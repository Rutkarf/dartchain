/**
 * Registre de ressources Three.js / listeners — dispose additif, n’enlève
 * pas les chemins `dispose()` existants sur graph/world/joystick.
 */

export type StarConquestDisposable = { dispose: () => void };

export class StarConquestResourceRegistry {
  private readonly items: StarConquestDisposable[] = [];

  track<T extends StarConquestDisposable>(resource: T): T {
    this.items.push(resource);
    return resource;
  }

  get size(): number {
    return this.items.length;
  }

  disposeAll(): void {
    while (this.items.length) {
      const item = this.items.pop();
      try {
        item?.dispose();
      } catch {
        /* keep remaining cleanup */
      }
    }
  }
}
