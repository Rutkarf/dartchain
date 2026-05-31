import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ShowcasePanelComponent } from './showcase-panel';

describe('ShowcasePanelComponent', () => {
  let component: ShowcasePanelComponent;
  let fixture: ComponentFixture<ShowcasePanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShowcasePanelComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ShowcasePanelComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render collapsed handle when collapsed', () => {
    fixture.componentRef.setInput('activeTab', 'tours');
    fixture.componentRef.setInput('collapsed', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.showcase-panel__handle--collapsed')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-showcase-terminal')).toBeFalsy();
  });

  it('should render terminal when expanded', () => {
    fixture.componentRef.setInput('activeTab', 'tours');
    fixture.componentRef.setInput('collapsed', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-showcase-terminal')).toBeTruthy();
  });
});
