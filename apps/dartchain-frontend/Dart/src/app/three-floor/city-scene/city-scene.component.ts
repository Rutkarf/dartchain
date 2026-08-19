import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  inject,
} from '@angular/core';
import { Subscription, filter, take } from 'rxjs';
import { MapLoadingService } from '../../core/map/map-loading.service';
import { CharacterControlService } from '../../core/services/character-control.service';
import { ThreeSceneService } from '../../core/services/three-scene.service';

/**
 * Bootstrap du monde 3D (legacy floor ou Marseille OSM selon configuration).
 */
@Component({
  selector: 'app-city-scene',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './city-scene.component.html',
  styleUrl: './city-scene.component.css',
})
export class CitySceneComponent implements AfterViewInit, OnDestroy {
  private readonly mapLoading = inject(MapLoadingService);
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
      .subscribe(() => {
        void this.bootstrap();
      });

    if (this.threeScene.isReady()) {
      void this.bootstrap();
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.mapLoading.dispose();
  }

  private async bootstrap(): Promise<void> {
    if (this.created) return;
    const scene = this.threeScene.getScene();
    const camera = this.threeScene.getCamera();
    if (!scene || !camera) return;

    await this.mapLoading.initialize(scene, camera);
    this.characterControl.resetRunner();
    this.created = true;
  }
}
