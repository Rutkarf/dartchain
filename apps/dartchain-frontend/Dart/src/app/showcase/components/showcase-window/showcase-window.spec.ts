import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ShowcaseWindowComponent } from './showcase-window';

describe('ShowcaseWindowComponent', () => {
  let component: ShowcaseWindowComponent;
  let fixture: ComponentFixture<ShowcaseWindowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShowcaseWindowComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ShowcaseWindowComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
