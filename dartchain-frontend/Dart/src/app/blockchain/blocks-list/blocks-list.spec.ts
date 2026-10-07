import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlocksListComponent } from './blocks-list';

describe('BlocksList', () => {
  let component: BlocksListComponent;
  let fixture: ComponentFixture<BlocksListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlocksListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BlocksListComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('maps tx load ticks to four segments', () => {
    expect(component.txLoadTicks({ transactions: [] } as never)).toEqual([
      false,
      false,
      false,
      false,
    ]);
    expect(
      component.txLoadTicks({ transactions: [{}, {}, {}] } as never)
    ).toEqual([true, true, true, false]);
    expect(
      component.txLoadTicks({ transactions: [{}, {}, {}, {}, {}] } as never)
    ).toEqual([true, true, true, true]);
  });
});