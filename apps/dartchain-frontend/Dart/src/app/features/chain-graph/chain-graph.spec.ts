import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ChainGraphComponent } from './chain-graph';

describe('ChainGraphComponent', () => {
  it('renders nodes for provided blocks', () => {
    const fixture: ComponentFixture<ChainGraphComponent> = TestBed.createComponent(ChainGraphComponent);
    const component = fixture.componentInstance;

    fixture.componentRef.setInput('blocks', [
      {
        index: 0,
        previousHash: '0',
        timestamp: 1,
        data: 'genesis',
        nonce: 0,
        hash: 'hash-0',
      },
      {
        index: 1,
        previousHash: 'hash-0',
        timestamp: 2,
        data: 'next',
        nonce: 0,
        hash: 'hash-1',
      },
    ]);
    fixture.detectChanges();

    expect(component.layoutNodes()).toHaveLength(2);
    expect(component.linkSegments()).toHaveLength(1);
  });
});
