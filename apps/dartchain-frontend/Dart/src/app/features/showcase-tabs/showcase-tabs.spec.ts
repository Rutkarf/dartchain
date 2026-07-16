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
    component.selectTab('reseau');
    expect(emitted).toBe('reseau');
  });
});
