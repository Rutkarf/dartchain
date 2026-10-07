import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { RatePanelComponent } from './rate-panel';

@Component({
  selector: 'app-showcase-chart',
  standalone: true,
  template: '',
})
class MockShowcaseChartComponent {}

describe('RatePanelComponent', () => {
  let component: RatePanelComponent;
  let fixture: ComponentFixture<RatePanelComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RatePanelComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
      .overrideComponent(RatePanelComponent, {
        set: {
          imports: [MockShowcaseChartComponent],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(RatePanelComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    fixture.destroy();
    httpMock.match(() => true).forEach((request) => {
      try {
        const url = request.request.url;
        if (url.includes('/crypto-rates/chart') || url.includes('/chart')) {
          request.flush({
            symbol: 'BTC',
            range: '24h',
            currency: 'usd',
            low: '100',
            high: '110',
            points: [{ t: 1, v: 0.5 }],
          });
          return;
        }
        request.flush(request.request.method === 'GET' ? [] : {});
      } catch {
        // already handled
      }
    });
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
