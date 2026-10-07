import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LaunchFormDrawerComponent } from './launch-form-drawer';

describe('LaunchFormDrawerComponent', () => {
  let fixture: ComponentFixture<LaunchFormDrawerComponent>;
  let component: LaunchFormDrawerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LaunchFormDrawerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LaunchFormDrawerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
  });

  it('should render one-page launch drawer shell', () => {
    const title = fixture.nativeElement.querySelector('.launch-drawer__title');
    expect(title?.textContent?.trim()).toBe('Lancer un projet');
    expect(fixture.nativeElement.textContent).not.toContain('Launch Lab');
    expect(fixture.nativeElement.querySelector('app-launch-form-drawer-fx')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.launch-drawer-backdrop')).toBeTruthy();
  });

  it('should default chain to DartChain and require launch essentials', () => {
    expect(component.form.controls.chain.value).toBe('DartChain');
    expect(component.form.controls.description.hasError('required')).toBe(true);
    expect(component.form.controls.targetAmount.hasError('required')).toBe(true);
    expect(component.form.controls.totalSupply.hasError('required')).toBe(true);
    expect(component.form.controls.launchDate.hasError('required')).toBe(true);
    expect(component.form.controls.website.hasError('required')).toBe(true);
    expect(component.form.controls.acceptTerms.hasError('required')).toBe(true);
  });

  it('should reject hard cap below soft cap', () => {
    component.form.patchValue({
      targetAmount: 50000,
      hardCap: 1000,
    });
    expect(component.form.hasError('hardCapBelowTarget')).toBe(true);

    component.form.patchValue({ hardCap: 80000 });
    expect(component.form.hasError('hardCapBelowTarget')).toBe(false);
  });
});
