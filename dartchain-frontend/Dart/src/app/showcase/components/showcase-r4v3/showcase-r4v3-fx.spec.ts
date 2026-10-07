import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowcaseR4v3FxComponent } from './showcase-r4v3-fx';

describe('ShowcaseR4v3FxComponent', () => {
  let fixture: ComponentFixture<ShowcaseR4v3FxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShowcaseR4v3FxComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ShowcaseR4v3FxComponent);
  });

  it('should create canvas host', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.showcase-r4v3-fx__canvas')).toBeTruthy();
  });
});
