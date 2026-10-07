import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { Block } from '@blockchain/models/block.model';
import {
  buildChainGraphNodes,
  chainGraphDimensions,
  chainGraphLinkSegment,
  chainGraphMinWidthPercent,
  chainGraphPointForIndex,
  CHAIN_GRAPH_HIT_RADIUS,
  CHAIN_GRAPH_NODE_RADIUS,
} from './chain-explorer.util';

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
  readonly maxNodes = input(45);

  readonly selectBlock = output<Block>();

  readonly hitRadius = CHAIN_GRAPH_HIT_RADIUS;
  readonly nodeRadius = CHAIN_GRAPH_NODE_RADIUS;

  readonly layoutNodes = computed<ChainGraphNodeLayout[]>(() => {
    const nodes = buildChainGraphNodes(this.blocks(), this.maxNodes());
    const tip = this.tipIndex();

    return nodes.map((block, index) => {
      const point = chainGraphPointForIndex(index);
      return {
        block,
        x: point.x,
        y: point.y,
        isTip: tip != null ? block.index === tip : index === nodes.length - 1,
      };
    });
  });

  readonly graphSize = computed(() => chainGraphDimensions(this.layoutNodes().length));

  readonly graphWidth = computed(() => this.graphSize().width);

  readonly graphHeight = computed(() => this.graphSize().height);

  readonly minWidthPercent = computed(() => chainGraphMinWidthPercent(this.layoutNodes().length));

  readonly linkSegments = computed(() => {
    const nodes = this.layoutNodes();
    const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

    for (let index = 1; index < nodes.length; index += 1) {
      const previous = nodes[index - 1];
      const current = nodes[index];
      segments.push(chainGraphLinkSegment(previous, current));
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
