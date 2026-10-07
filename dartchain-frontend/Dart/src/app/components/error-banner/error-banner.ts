import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-banner.html',
  styleUrls: ['./error-banner.css'],
})
export class ErrorBannerComponent {
  message = input.required<string>();
}