import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { NavbarNetworkStatusComponent } from './navbar-network-status';

describe('NavbarNetworkStatusComponent', () => {
  let component: NavbarNetworkStatusComponent;
  let fixture: ComponentFixture<NavbarNetworkStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarNetworkStatusComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarNetworkStatusComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
