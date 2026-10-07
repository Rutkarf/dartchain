import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DockTabsComponent } from './dock-tabs';

describe('DockTabs', () => {
  let component: DockTabsComponent;
  let fixture: ComponentFixture<DockTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DockTabsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DockTabsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
