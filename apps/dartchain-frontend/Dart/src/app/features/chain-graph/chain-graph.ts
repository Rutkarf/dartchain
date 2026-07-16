import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { Block } from '../../core/models/block.model';
import { buildChainGraphNodes } from './chain-explorer.util';

export interface ChainGraphNodeLayout {
  block: Block;
  x: number;
  y: number;
  isTip: boolean;
}

@Component({
  selector: 'app-chain-graph',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chain-graph.html',
  styleUrls: ['./chain-graph.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChainGraphComponent {
  readonly blocks = input<Block[]>([]);
  readonly tipIndex = input<number | null>(null);
  readonly maxNodes = input(20);

  readonly selectBlock = output<Block>();

  readonly graphWidth = computed(() => {
    const count = this.layoutNodes().length;
    return Math.max(240, count * 72 + 24);
  });

  readonly layoutNodes = computed<ChainGraphNodeLayout[]>(() => {
    const nodes = buildChainGraphNodes(this.blocks(), this.maxNodes());
    const tip = this.tipIndex();

    return nodes.map((block, index) => ({
      block,
      x: 24 + index * 72,
      y: 42,
      isTip: tip != null ? block.index === tip : index === nodes.length - 1,
    }));
  });

  readonly linkSegments = computed(() => {
    const nodes = this.layoutNodes();
    const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

    for (let index = 1; index < nodes.length; index += 1) {
      const previous = nodes[index - 1];
      const current = nodes[index];
      segments.push({
        x1: previous.x + 18,
        y1: previous.y,
        x2: current.x - 18,
        y2: current.y,
      });
    }

    return segments;
  });

  shortHash(hash: string | null | undefined): string {
    if (!hash) {
      return 'N/A';
    }

    if (hash.length <= 10) {
      return hash;
    }

    return `${hash.slice(0, 4)}…${hash.slice(-4)}`;
  }

  openBlock(block: Block): void {
    this.selectBlock.emit(block);
  }
}
