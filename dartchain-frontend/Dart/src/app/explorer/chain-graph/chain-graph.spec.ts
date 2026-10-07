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
    // Première colonne : onde descendante
    expect(component.layoutNodes()[0].x).toBe(component.layoutNodes()[1].x);
    expect(component.layoutNodes()[0].y).toBeLessThan(component.layoutNodes()[1].y);
  });

  it('emits selectBlock when a node bubble is clicked', () => {
    const fixture: ComponentFixture<ChainGraphComponent> = TestBed.createComponent(ChainGraphComponent);
    const component = fixture.componentInstance;
    const emitted: number[] = [];
    component.selectBlock.subscribe((block) => emitted.push(block.index));

    fixture.componentRef.setInput('blocks', [
      {
        index: 3,
        previousHash: 'hash-2',
        timestamp: 3,
        data: 'block-3',
        nonce: 0,
        hash: 'hash-3',
      },
    ]);
    fixture.detectChanges();

    const node = fixture.nativeElement.querySelector('.chain-graph__node') as SVGGElement;
    expect(node).toBeTruthy();
    node.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(emitted).toEqual([3]);
  });
});
