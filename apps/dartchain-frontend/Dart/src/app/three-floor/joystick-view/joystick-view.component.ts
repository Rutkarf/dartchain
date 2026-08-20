import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CharacterControlService } from '../../core/services/character-control.service';
import {
  mapViewJoystickVector,
  ViewJoystickSmoother,
} from '../joystick-shared/view-joystick.input';
import {
  VirtualJoystickComponent,
  type JoystickVector,
} from '../joystick-shared/virtual-joystick.component';

/**
 * [starConquest 2026-08] Renommé depuis JoystickCamera / JoystickLook → JoystickView.
 * Zone bas-droite : yaw / pitch caméra 3ᵉ personne (dead zone, courbe, lissage locaux).
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
  private readonly smoother = new ViewJoystickSmoother();

  onVector(vector: JoystickVector): void {
    const mapped = mapViewJoystickVector(vector);
    const view = this.smoother.push(mapped, performance.now());
    this.control.onCameraJoystickUpdate({ x: view.yaw, y: view.pitch });
  }
}
