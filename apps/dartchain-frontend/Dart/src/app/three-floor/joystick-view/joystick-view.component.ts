import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CharacterControlService } from '../../core/services/character-control.service';
import {
  VirtualJoystickComponent,
  type JoystickVector,
} from '../joystick-shared/virtual-joystick.component';

/**
 * [starConquest 2026-08] Renommé depuis JoystickCamera / JoystickLook → JoystickView.
 * Zone bas-droite 250×550 : yaw / pitch caméra 3ᵉ personne.
 */
@Component({
  selector: 'app-joystick-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VirtualJoystickComponent],
  templateUrl: './joystick-view.component.html',
  styleUrl: './joystick-view.component.css',
})
export class JoystickViewComponent {
  private readonly control = inject(CharacterControlService);

  onVector(vector: JoystickVector): void {
    this.control.onCameraJoystickUpdate(vector);
  }
}
