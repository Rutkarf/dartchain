import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CharacterControlService } from '../../core/services/character-control.service';
import { mapMoveJoystickVector } from '../joystick-shared/move-joystick.input';
import {
  VirtualJoystickComponent,
  type JoystickVector,
} from '../joystick-shared/virtual-joystick.component';

/**
 * Zone bas-gauche : déplacement CharacterAnon.
 * Intention MOVE typée ; gait walk/run et collisions restent dans le service.
 */
@Component({
  selector: 'app-joystick-move',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VirtualJoystickComponent],
  templateUrl: './joystick-move.component.html',
  styleUrl: './joystick-move.component.css',
})
export class JoystickMoveComponent {
  private readonly control = inject(CharacterControlService);

  onVector(vector: JoystickVector): void {
    const move = mapMoveJoystickVector(vector);
    this.control.onMovementJoystickUpdate({ x: move.x, y: move.y });
  }
}
