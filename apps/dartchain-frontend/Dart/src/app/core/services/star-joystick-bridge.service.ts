import { Injectable } from '@angular/core';
import type { StarConquestJoystick } from '../../particle-background/star-conquest/star-conquest-joystick';

/**
 * Pont floor ↔ particle-background : le joystick vit dans la scène floor,
 * l’interaction pointeur reste sur le canvas neuronal (floor = pointer-events none).
 */
@Injectable({ providedIn: 'root' })
export class StarJoystickBridgeService {
  private joy: StarConquestJoystick | null = null;

  register(joystick: StarConquestJoystick): void {
    this.joy = joystick;
  }

  unregister(joystick?: StarConquestJoystick): void {
    if (!joystick || this.joy === joystick) this.joy = null;
  }

  get(): StarConquestJoystick | null {
    return this.joy;
  }
}
