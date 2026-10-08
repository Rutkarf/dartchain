import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';

import { CreateLaunchProjectRequest } from '@showcase/models/showcase.model';
import { FocusTrapDirective } from '@core/directives/focus-trap.directive';
import { LaunchFormDrawerFxComponent } from './launch-form-drawer-fx';

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

function hardCapAtLeastTargetValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const target = Number(group.get('targetAmount')?.value);
    const hard = group.get('hardCap')?.value;
    if (hard == null || hard === '' || Number.isNaN(Number(hard))) {
      return null;
    }
    const hardCap = Number(hard);
    if (!Number.isFinite(target) || target <= 0) {
      return null;
    }
    return hardCap >= target ? null : { hardCapBelowTarget: true };
  };
}

function optionalHttpUrl(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = typeof control.value === 'string' ? control.value.trim() : '';
    if (!raw) {
      return null;
    }
    try {
      const url = new URL(raw);
      return url.protocol === 'http:' || url.protocol === 'https:' ? null : { url: true };
    } catch {
      return { url: true };
    }
  };
}

@Component({
  selector: 'app-launch-form-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FocusTrapDirective, LaunchFormDrawerFxComponent],
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

  /** DartChain en tête — chaîne native du laboratoire. */
  readonly chainOptions = [
    'DartChain',
    'BSC',
    'ETH',
    'SOL',
    'BASE',
    'ARB',
    'POLYGON',
    'AVAX',
  ] as const;

  readonly form = this.fb.group(
    {
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
      description: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(600)]],
      chain: ['DartChain', [Validators.required]],
      totalSupply: [null as number | null, [Validators.required, Validators.min(1)]],
      decimals: [18, [Validators.required, Validators.min(0), Validators.max(18)]],
      targetAmount: [null as number | null, [Validators.required, Validators.min(1)]],
      hardCap: [null as number | null, [Validators.min(0)]],
      liquidityPercent: [70 as number | null, [Validators.min(0), Validators.max(100)]],
      launchDate: ['', [Validators.required]],
      contractAddress: ['', [Validators.maxLength(120)]],
      website: ['', [Validators.required, Validators.maxLength(2048), optionalHttpUrl()]],
      whitepaperUrl: ['', [Validators.maxLength(2048), optionalHttpUrl()]],
      twitter: ['', [Validators.maxLength(120)]],
      telegram: ['', [Validators.maxLength(120)]],
      discord: ['', [Validators.maxLength(120)]],
      acceptTerms: [false, [Validators.requiredTrue]],
    },
    { validators: [hardCapAtLeastTargetValidator()] }
  );

  private readonly descriptionValue = toSignal(
    this.form.controls.description.valueChanges.pipe(
      startWith(this.form.controls.description.value)
    ),
    { initialValue: '' }
  );

  readonly descriptionLength = computed(() => (this.descriptionValue() ?? '').length);

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

    if (!raw.name || !raw.symbol || !raw.description || !raw.website || !raw.launchDate) {
      return;
    }

    this.create.emit({
      name: raw.name.trim(),
      symbol: raw.symbol.trim().toUpperCase(),
      description: this.optionalText(raw.description),
      logoUrl: this.logoPreview(),
      chain: raw.chain?.trim() || 'DartChain',
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
      chain: 'DartChain',
      totalSupply: null,
      decimals: 18,
      targetAmount: null,
      hardCap: null,
      liquidityPercent: 70,
      launchDate: '',
      contractAddress: '',
      website: '',
      whitepaperUrl: '',
      twitter: '',
      telegram: '',
      discord: '',
      acceptTerms: false,
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
