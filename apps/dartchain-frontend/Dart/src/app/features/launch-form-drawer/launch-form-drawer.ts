import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { CreateLaunchProjectRequest } from '../../core/models/showcase.model';
import { FocusTrapDirective } from '../../core/directives/focus-trap.directive';

const LOGO_MAX_BYTES = 200_000;

type LaunchNumberField =
  | 'totalSupply'
  | 'decimals'
  | 'targetAmount'
  | 'hardCap'
  | 'liquidityPercent';

interface LaunchNumberFieldConfig {
  min: number;
  max: number;
  step: number;
}

@Component({
  selector: 'app-launch-form-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FocusTrapDirective],
  templateUrl: './launch-form-drawer.html',
  styleUrls: ['./launch-form-drawer.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LaunchFormDrawerComponent {
  private readonly fb = inject(FormBuilder);

  open = input(false);
  submitting = input(false);
  errorMessage = input<string | null>(null);

  close = output<void>();
  create = output<CreateLaunchProjectRequest>();

  readonly logoPreview = signal<string | null>(null);
  readonly logoError = signal<string | null>(null);

  readonly chainOptions = ['BSC', 'ETH', 'SOL', 'BASE', 'ARB', 'POLYGON', 'AVAX'] as const;

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(40)]],
    symbol: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(8),
        Validators.pattern(/^[A-Za-z0-9]+$/),
      ],
    ],
    description: ['', [Validators.maxLength(600)]],
    chain: ['BSC', [Validators.required]],
    totalSupply: [null as number | null, [Validators.min(1)]],
    decimals: [18, [Validators.required, Validators.min(0), Validators.max(18)]],
    targetAmount: [null as number | null, [Validators.min(0)]],
    hardCap: [null as number | null, [Validators.min(0)]],
    liquidityPercent: [null as number | null, [Validators.min(0), Validators.max(100)]],
    launchDate: [''],
    contractAddress: ['', [Validators.maxLength(120)]],
    website: ['', [Validators.maxLength(2048)]],
    whitepaperUrl: ['', [Validators.maxLength(2048)]],
    twitter: ['', [Validators.maxLength(120)]],
    telegram: ['', [Validators.maxLength(120)]],
    discord: ['', [Validators.maxLength(120)]],
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        this.resetForm();
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open() && !this.submitting()) {
      this.closeDrawer();
    }
  }

  closeDrawer(): void {
    if (this.submitting()) {
      return;
    }
    this.close.emit();
  }

  onLogoChange(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.logoError.set('Format image requis (PNG, JPG, SVG, WebP).');
      inputEl.value = '';
      return;
    }

    if (file.size > LOGO_MAX_BYTES) {
      this.logoError.set('Logo trop volumineux (max 200 Ko).');
      inputEl.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      this.logoPreview.set(result);
      this.logoError.set(null);
    };
    reader.onerror = () => {
      this.logoError.set('Lecture du logo impossible.');
    };
    reader.readAsDataURL(file);
  }

  clearLogo(): void {
    this.logoPreview.set(null);
    this.logoError.set(null);
  }

  stepNumber(field: LaunchNumberField, direction: 1 | -1): void {
    const config = this.numberFieldConfig(field);
    const control = this.form.get(field);

    if (!control) {
      return;
    }

    const raw = control.value as number | null;
    const parsed = raw === null ? null : Number(raw);
    const base =
      parsed === null || Number.isNaN(parsed)
        ? direction > 0
          ? config.min
          : config.max
        : parsed;

    let next = base + direction * config.step;
    next = Math.min(config.max, Math.max(config.min, next));
    control.setValue(next);
    control.markAsDirty();
  }

  private numberFieldConfig(field: LaunchNumberField): LaunchNumberFieldConfig {
    switch (field) {
      case 'totalSupply':
        return { min: 1, max: Number.MAX_SAFE_INTEGER, step: 1 };
      case 'decimals':
        return { min: 0, max: 18, step: 1 };
      case 'targetAmount':
      case 'hardCap':
        return { min: 0, max: Number.MAX_SAFE_INTEGER, step: 100 };
      case 'liquidityPercent':
        return { min: 0, max: 100, step: 1 };
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    if (!raw.name || !raw.symbol) {
      return;
    }

    this.create.emit({
      name: raw.name.trim(),
      symbol: raw.symbol.trim().toUpperCase(),
      description: this.optionalText(raw.description),
      logoUrl: this.logoPreview(),
      chain: raw.chain?.trim() || null,
      totalSupply: this.optionalPositive(raw.totalSupply),
      decimals: raw.decimals ?? 18,
      targetAmount: this.optionalPositive(raw.targetAmount),
      hardCap: this.optionalPositive(raw.hardCap),
      liquidityPercent: this.optionalPositive(raw.liquidityPercent),
      launchDate: this.optionalText(raw.launchDate),
      contractAddress: this.optionalText(raw.contractAddress),
      website: this.optionalText(raw.website),
      whitepaperUrl: this.optionalText(raw.whitepaperUrl),
      twitter: this.optionalText(raw.twitter),
      telegram: this.optionalText(raw.telegram),
      discord: this.optionalText(raw.discord),
    });
  }

  private resetForm(): void {
    this.form.reset({
      name: '',
      symbol: '',
      description: '',
      chain: 'BSC',
      totalSupply: null,
      decimals: 18,
      targetAmount: null,
      hardCap: null,
      liquidityPercent: null,
      launchDate: '',
      contractAddress: '',
      website: '',
      whitepaperUrl: '',
      twitter: '',
      telegram: '',
      discord: '',
    });
    this.logoPreview.set(null);
    this.logoError.set(null);
  }

  private optionalText(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private optionalPositive(value: number | null | undefined): number | null {
    if (value == null || value <= 0) {
      return null;
    }
    return value;
  }
}
