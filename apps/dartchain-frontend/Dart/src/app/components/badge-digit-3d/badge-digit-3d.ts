import { Component, Input } from '@angular/core';

/**
 * Badge chiffre chrome — rendu 2D (pas de WebGL).
 * Ancien canvas Three.js saturait les contextes et blanchissait logo / icônes.
 */
@Component({
  selector: 'app-badge-digit-3d',
  standalone: true,
  templateUrl: './badge-digit-3d.html',
  styleUrl: './badge-digit-3d.css',
})
export class BadgeDigit3dComponent {
  /** Digits to render (e.g. "12", "99+"). */
  @Input({ required: true }) text = '';
}
