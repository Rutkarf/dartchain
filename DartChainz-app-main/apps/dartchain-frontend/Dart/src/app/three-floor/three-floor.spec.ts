import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThreeFloor } from './three-floor';

describe('ThreeFloor', () => {
  let component: ThreeFloor;
  let fixture: ComponentFixture<ThreeFloor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThreeFloor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThreeFloor);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
