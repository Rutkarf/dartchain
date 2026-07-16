import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ExplorerSearchComponent } from './explorer-search';

describe('ExplorerSearchComponent', () => {
  let component: ExplorerSearchComponent;
  let fixture: ComponentFixture<ExplorerSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExplorerSearchComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ExplorerSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders placeholder on the search input at init', () => {
    const input = fixture.nativeElement.querySelector(
      '.explorer-search__input'
    ) as HTMLInputElement;
    expect(input?.placeholder).toBe('Explore Block, Hash, ...');
  });

  it('always exposes placeholder text for the input', () => {
    expect(component.placeholderText).toBe('Explore Block, Hash, ...');
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.placeholder).toBe('Explore Block, Hash, ...');
  });
});
