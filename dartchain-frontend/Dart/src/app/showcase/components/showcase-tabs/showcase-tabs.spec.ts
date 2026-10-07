import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowcaseTabsComponent } from './showcase-tabs';

describe('ShowcaseTabsComponent', () => {
  let component: ShowcaseTabsComponent;
  let fixture: ComponentFixture<ShowcaseTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShowcaseTabsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ShowcaseTabsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit tabChange when selecting a new tab', () => {
    let emitted: string | undefined;
    component.tabChange.subscribe((tab) => {
      emitted = tab;
    });
    component.selectTab('market');
    expect(emitted).toBe('market');
  });

  it('should collapse an expanded panel on tab double-click', () => {
    fixture.componentRef.setInput('collapsed', false);
    fixture.detectChanges();
    let emitted: boolean | undefined;
    component.tabDoubleClick.subscribe((collapsed) => {
      emitted = collapsed;
    });
    const tab = fixture.nativeElement.querySelector('.showcase-tab') as HTMLButtonElement;
    tab.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    // Premier clic peut déjà avoir ouvert le panneau : l'état capturé prime.
    component.collapsed = false;
    tab.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    tab.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(emitted).toBe(true);
  });

  it('should expand a collapsed panel on tab double-click', () => {
    fixture.componentRef.setInput('collapsed', true);
    fixture.detectChanges();
    let emitted: boolean | undefined;
    component.tabDoubleClick.subscribe((collapsed) => {
      emitted = collapsed;
    });
    const tab = fixture.nativeElement.querySelector('.showcase-tab') as HTMLButtonElement;
    tab.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    // Premier clic déplie avant le dblclick — on doit rester sur déplié.
    component.collapsed = false;
    tab.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    tab.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(emitted).toBe(false);
  });

  it('should emit tabChange when clicking the active tab while collapsed', () => {
    fixture.componentRef.setInput('collapsed', true);
    fixture.componentRef.setInput('activeTab', 'tours');
    fixture.detectChanges();
    let emitted: string | undefined;
    component.tabChange.subscribe((tab) => {
      emitted = tab;
    });
    component.selectTab('tours');
    expect(emitted).toBe('tours');
  });

  it('should not emit tabChange when clicking the active tab while expanded', () => {
    fixture.componentRef.setInput('collapsed', false);
    fixture.componentRef.setInput('activeTab', 'tours');
    fixture.detectChanges();
    let emitted: string | undefined;
    component.tabChange.subscribe((tab) => {
      emitted = tab;
    });
    component.selectTab('tours');
    expect(emitted).toBeUndefined();
  });
});
