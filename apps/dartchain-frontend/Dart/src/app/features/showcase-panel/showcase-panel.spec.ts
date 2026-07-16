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
    HTMLElement.prototype.scrollIntoView = function () {};
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render news summary when tours tab is collapsed', () => {
    fixture.componentRef.setInput('activeTab', 'tours');
    fixture.componentRef.setInput('collapsed', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.showcase-panel__handle--collapsed')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('app-showcase-news-summary')).toBeTruthy();
  });

  it('should defer heavy tours content when expanded', () => {
    fixture.componentRef.setInput('activeTab', 'tours');
    fixture.componentRef.setInput('collapsed', false);
    fixture.detectChanges();

    const placeholder = fixture.nativeElement.querySelector('.showcase-window__defer');
    const news = fixture.nativeElement.querySelector('app-showcase-news');
    expect(placeholder || news).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-showcase-terminal')).toBeFalsy();
  });

  it('should defer heavy terminal content when reseau tab is expanded', () => {
    fixture.componentRef.setInput('activeTab', 'reseau');
    fixture.componentRef.setInput('collapsed', false);
    fixture.detectChanges();

    const placeholder = fixture.nativeElement.querySelector('.showcase-window__defer');
    const terminal = fixture.nativeElement.querySelector('app-showcase-terminal');
    expect(placeholder || terminal).toBeTruthy();
  });

  it('should render collapsed handle when reseau tab is collapsed', () => {
    fixture.componentRef.setInput('activeTab', 'reseau');
    fixture.componentRef.setInput('collapsed', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.showcase-panel__handle--collapsed')).toBeTruthy();
    const body = fixture.nativeElement.querySelector('.showcase-panel__body');
    expect(body?.getAttribute('aria-hidden')).toBe('true');
  });

  it('should defer heavy chat content when rv23 tab is expanded', () => {
    fixture.componentRef.setInput('activeTab', 'rv23');
    fixture.componentRef.setInput('collapsed', false);
    fixture.detectChanges();

    const placeholder = fixture.nativeElement.querySelector('.showcase-window__defer');
    const chat = fixture.nativeElement.querySelector('app-showcase-chat');
    expect(placeholder || chat).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-showcase-terminal')).toBeFalsy();
  });

  it('should defer heavy launch content when dao tab is expanded', () => {
    fixture.componentRef.setInput('activeTab', 'dao');
    fixture.componentRef.setInput('collapsed', false);
    fixture.detectChanges();

    const placeholder = fixture.nativeElement.querySelector('.showcase-window__defer');
    const launch = fixture.nativeElement.querySelector('app-showcase-launch');
    expect(placeholder || launch).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-showcase-terminal')).toBeFalsy();
  });

  it('should render smart summary when rv23 tab is collapsed', () => {
    fixture.componentRef.setInput('activeTab', 'rv23');
    fixture.componentRef.setInput('collapsed', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.showcase-panel__handle--collapsed')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('app-showcase-chat-summary')).toBeTruthy();
  });
});
