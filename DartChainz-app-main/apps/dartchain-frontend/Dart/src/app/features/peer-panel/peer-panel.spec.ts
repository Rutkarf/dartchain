import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PeerPanelComponent } from './peer-panel';

describe('PeerPanel', () => {
  let component: PeerPanelComponent;
  let fixture: ComponentFixture<PeerPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PeerPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PeerPanelComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
