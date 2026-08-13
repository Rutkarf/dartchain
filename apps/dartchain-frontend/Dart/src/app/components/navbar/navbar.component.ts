import { Component, EventEmitter, Output } from '@angular/core';

import { Block } from '../../core/models/block.model';
import { NavbarShellComponent } from '../../navbar/navbar';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [NavbarShellComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  @Output() readonly exploreBlock = new EventEmitter<Block>();
  @Output() readonly explorePending = new EventEmitter<void>();
}
