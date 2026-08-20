import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  inject,
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Subscription, filter, take } from 'rxjs';
import { CharacterNftApiService } from '../../core/services/character-nft-api.service';
import { CharacterNftService } from '../../core/services/character-nft.service';
import { CharacterControlService } from '../../core/services/character-control.service';
import { ThreeSceneService } from '../../core/services/three-scene.service';
import { FloorSessionAdapter } from '../floor-runtime/floor-session.adapter';
import { FloorSessionBinder } from '../floor-runtime/floor-session.binder';

/**
 * Point d’entrée CharacterAnon.fbx + caméra View joystick.
 */
@Component({
  selector: 'app-character',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe],
  templateUrl: './character.component.html',
  styleUrl: './character.component.css',
})
export class CharacterComponent implements AfterViewInit, OnDestroy {
  private readonly characterNft = inject(CharacterNftService);
  private readonly characterApi = inject(CharacterNftApiService);
  private readonly characterControl = inject(CharacterControlService);
  private readonly threeScene = inject(ThreeSceneService);
  private readonly session = inject(FloorSessionAdapter);
  private readonly sessionBinder = inject(FloorSessionBinder);

  readonly climbPrompt$ = this.characterControl.climbPrompt$;

  private sub?: Subscription;
  private bootstrapped = false;

  ngAfterViewInit(): void {
    this.sub = this.threeScene.ready$
      .pipe(
        filter((ready) => ready),
        take(1)
      )
      .subscribe(() => {
        void this.bootstrapCharacter();
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    const scene = this.threeScene.getScene() ?? undefined;
    this.characterNft.dispose(scene);
  }

  private async bootstrapCharacter(): Promise<void> {
    if (this.bootstrapped) return;
    const scene = this.threeScene.getScene();
    if (!scene) return;
    this.bootstrapped = true;
    void this.sessionBinder;
    const userId = this.session.playerId();
    const nft = await this.characterApi.fetchMine(userId);
    await this.characterNft.loadCharacterForUser(userId, scene, nft?.stlPath);
    this.characterControl.resetRunner();
  }
}
