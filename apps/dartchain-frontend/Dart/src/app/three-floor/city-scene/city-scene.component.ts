import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  inject,
} from '@angular/core';
import { Subscription, filter, take } from 'rxjs';
import { RunnerWorldService } from '../../core/services/runner/runner-world.service';
import { CharacterControlService } from '../../core/services/character-control.service';
import { ThreeSceneService } from '../../core/services/three-scene.service';

/**
 * Bootstrap monde endless runner (segments courbés + bâtiments latéraux).
 * Remplace l’ancienne ville fixe en arc.
 */
@Component({
  selector: 'app-city-scene',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './city-scene.component.html',
  styleUrl: './city-scene.component.css',
})
export class CitySceneComponent implements AfterViewInit, OnDestroy {
  private readonly runnerWorld = inject(RunnerWorldService);
  private readonly characterControl = inject(CharacterControlService);
  private readonly threeScene = inject(ThreeSceneService);
  private sub?: Subscription;
  private created = false;

  ngAfterViewInit(): void {
    this.sub = this.threeScene.ready$
      .pipe(
        filter((ready) => ready),
        take(1)
      )
      .subscribe(() => this.bootstrap());

    if (this.threeScene.isReady()) {
      this.bootstrap();
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.runnerWorld.dispose(this.threeScene.getScene() ?? undefined);
  }

  private bootstrap(): void {
    if (this.created) return;
    const scene = this.threeScene.getScene();
    if (!scene) return;
    this.runnerWorld.start(scene);
    this.characterControl.resetRunner();
    this.created = true;
  }
}
