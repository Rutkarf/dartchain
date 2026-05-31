import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CommonModule } from '@angular/common';

import { FaucetComponent } from './faucet';

@Component({
  selector: 'app-r4v3-three',
  standalone: true,
  template: '',
})
class MockR4v3ThreeComponent {
  @Input() modelTargetSize = 16;
  @Input() externalRotation?: { x: number; y: number; z: number };

  randomizeFromParentClick(): void {}
}

describe('Faucet', () => {
  let component: FaucetComponent;
  let fixture: ComponentFixture<FaucetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FaucetComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
      .overrideComponent(FaucetComponent, {
        set: {
          imports: [CommonModule, MockR4v3ThreeComponent],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(FaucetComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
