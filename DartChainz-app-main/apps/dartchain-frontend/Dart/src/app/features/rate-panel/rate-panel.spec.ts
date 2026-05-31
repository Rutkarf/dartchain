import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { RatePanelComponent } from './rate-panel';

describe('RatePanelComponent', () => {
  let component: RatePanelComponent;
  let fixture: ComponentFixture<RatePanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RatePanelComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(RatePanelComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
