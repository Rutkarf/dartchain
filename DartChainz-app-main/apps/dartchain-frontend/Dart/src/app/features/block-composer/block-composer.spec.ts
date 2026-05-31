import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlockComposerComponent } from './block-composer';

describe('BlockComposer', () => {
  let component: BlockComposerComponent;
  let fixture: ComponentFixture<BlockComposerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlockComposerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BlockComposerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
