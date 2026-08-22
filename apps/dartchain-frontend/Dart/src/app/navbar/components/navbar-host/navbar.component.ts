import { Component, EventEmitter, Output } from '@angular/core';

import { Block } from '@blockchain/models/block.model';
import { NavbarShellComponent } from '../../navbar';

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
