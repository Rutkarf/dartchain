import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlockDetailDrawerComponent } from './block-detail-drawer';

describe('BlockDetailDrawer', () => {
  let component: BlockDetailDrawerComponent;
  let fixture: ComponentFixture<BlockDetailDrawerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlockDetailDrawerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BlockDetailDrawerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
