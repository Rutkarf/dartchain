import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabCollapseGesture } from '../../../components/tab-collapse-gesture';
import { BottomDockTab } from '@dock/services/dock-navigation.service';

/**
 * Harness léger : même contrat que DockTabsDockTabsComponent.selectDockTab /
 * onTabDoubleClick, sans monter wallet/faucet/quests.
 */
@Component({
  standalone: true,
  template: `
    <nav class="showcase-tabs" (pointerdown)="onTabPointerDown($event)" (dblclick)="onTabDoubleClick($event)">
      <button type="button" class="showcase-tab" (click)="selectDockTab('wallet')">Wallet</button>
    </nav>
  `,
})
class DockTabSelectHarness {
  activeTab: BottomDockTab = 'wallet';
  dockCollapsed = false;
  readonly tabChanges: BottomDockTab[] = [];
  readonly doubleClicks: boolean[] = [];
  private readonly collapseGesture = new TabCollapseGesture();

  selectDockTab(tab: BottomDockTab): void {
    if (tab === this.activeTab && !this.dockCollapsed) {
      return;
    }
    this.tabChanges.push(tab);
  }

  onTabPointerDown(event: PointerEvent): void {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('.showcase-tab')) {
      return;
    }
    this.collapseGesture.notePointerDown(this.dockCollapsed);
  }

  onTabDoubleClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('.showcase-tab')) {
      return;
    }
    event.preventDefault();
    this.doubleClicks.push(this.collapseGesture.resolveDoubleClick(this.dockCollapsed));
  }
}

describe('Dock tab select / double-click contract', () => {
  let fixture: ComponentFixture<DockTabSelectHarness>;
  let component: DockTabSelectHarness;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DockTabSelectHarness],
    }).compileComponents();
    fixture = TestBed.createComponent(DockTabSelectHarness);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('does not re-emit when the active tab is already expanded', () => {
    component.selectDockTab('wallet');
    expect(component.tabChanges).toEqual([]);
  });

  it('emits when the active tab is collapsed so a click can expand', () => {
    component.dockCollapsed = true;
    component.selectDockTab('wallet');
    expect(component.tabChanges).toEqual(['wallet']);
  });

  it('emits when selecting another tab', () => {
    component.selectDockTab('quests');
    expect(component.tabChanges).toEqual(['quests']);
  });

  it('collapses from expanded state on tab double-click', () => {
    component.dockCollapsed = false;
    const tab = fixture.nativeElement.querySelector('.showcase-tab') as HTMLButtonElement;
    tab.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    tab.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    tab.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(component.doubleClicks).toEqual([true]);
  });

  it('expands from collapsed state on tab double-click', () => {
    component.dockCollapsed = true;
    const tab = fixture.nativeElement.querySelector('.showcase-tab') as HTMLButtonElement;
    tab.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    component.dockCollapsed = false;
    tab.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    tab.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(component.doubleClicks).toEqual([false]);
  });
});
