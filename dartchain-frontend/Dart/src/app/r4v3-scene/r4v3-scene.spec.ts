import { ComponentFixture, TestBed } from '@angular/core/testing';

import { R4v3SceneComponent } from './r4v3-scene';

describe('R4v3Scene', () => {
  let component: R4v3SceneComponent;
  let fixture: ComponentFixture<R4v3SceneComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [R4v3SceneComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(R4v3SceneComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
