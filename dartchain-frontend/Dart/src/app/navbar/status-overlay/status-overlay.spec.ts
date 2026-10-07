import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatusOverlayComponent } from './status-overlay';

describe('StatusOverlay', () => {
  let component: StatusOverlayComponent;
  let fixture: ComponentFixture<StatusOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatusOverlayComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
