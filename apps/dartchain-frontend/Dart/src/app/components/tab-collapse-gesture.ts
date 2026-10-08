/** Fenêtre assez large pour un dblclick OS + éventuel layout après dépli. */
const GESTURE_WINDOW_MS = 900;

/**
 * Mémorise l'état replié au premier appui.
 * Le simple clic ouvre déjà le panneau avant le dblclick : sans cette mémoire,
 * un double-clic replierait un panneau que le premier clic vient d'ouvrir.
 *
 * Contrat : dblclick sur onglet replié → déplier ; sur onglet déplié → replier.
 */
export class TabCollapseGesture {
  private captured: boolean | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  notePointerDown(collapsed: boolean): void {
    if (this.captured === null) {
      this.captured = collapsed;
    }
    if (this.timer !== null) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.captured = null;
      this.timer = null;
    }, GESTURE_WINDOW_MS);
  }

  /** État replié à appliquer : l'inverse de l'état au début du geste. */
  resolveDoubleClick(collapsed: boolean): boolean {
    const before = this.captured ?? collapsed;
    this.dispose();
    return !before;
  }

  dispose(): void {
    this.captured = null;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
