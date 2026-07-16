import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParticleBackgroundComponent } from './particle-background';

describe('ParticleBackground', () => {
  let component: ParticleBackgroundComponent;
  let fixture: ComponentFixture<ParticleBackgroundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParticleBackgroundComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParticleBackgroundComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
