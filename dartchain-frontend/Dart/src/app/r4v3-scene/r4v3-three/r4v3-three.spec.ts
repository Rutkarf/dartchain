import { ComponentFixture, TestBed } from '@angular/core/testing';

import { R4v3ThreeComponent } from './r4v3-three';

describe('R4v3ThreeComponent', () => {
  let component: R4v3ThreeComponent;
  let fixture: ComponentFixture<R4v3ThreeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [R4v3ThreeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(R4v3ThreeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
