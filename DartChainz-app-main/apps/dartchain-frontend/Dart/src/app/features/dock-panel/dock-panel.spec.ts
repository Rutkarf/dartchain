import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { DockPanelComponent } from './dock-panel';

describe('DockPanelComponent', () => {
  let component: DockPanelComponent;
  let fixture: ComponentFixture<DockPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DockPanelComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(DockPanelComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render pending summary bar when collapsed on pending panel', () => {
    fixture.componentRef.setInput('activePanel', 'pending');
    fixture.componentRef.setInput('collapsed', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.dock-summary-bar')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.dock-summary-status')).toBeTruthy();
  });
});
