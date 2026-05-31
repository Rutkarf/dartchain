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
});
