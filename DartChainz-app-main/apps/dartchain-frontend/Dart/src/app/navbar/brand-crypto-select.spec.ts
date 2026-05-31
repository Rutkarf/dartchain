import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrandCryptoSelectComponent } from './brand-crypto-select';

describe('BrandCryptoSelectComponent', () => {
  let component: BrandCryptoSelectComponent;
  let fixture: ComponentFixture<BrandCryptoSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandCryptoSelectComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BrandCryptoSelectComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
