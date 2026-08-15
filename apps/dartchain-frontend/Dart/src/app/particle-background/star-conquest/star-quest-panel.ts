import { Component, inject } from '@angular/core';
import { StarConquestStateService } from '../../core/services/star-conquest-state.service';
import {
  STAR_QUEST_FAMILIES,
  type StarQuestFamily,
} from './star-conquest-families';

@Component({
  selector: 'app-star-quest-panel',
  standalone: true,
  templateUrl: './star-quest-panel.html',
  styleUrl: './star-quest-panel.css',
})
export class StarQuestPanelComponent {
  readonly state = inject(StarConquestStateService);

  familyLabel(family: StarQuestFamily): string {
    return STAR_QUEST_FAMILIES[family]?.label ?? family;
  }

  familyHex(family: StarQuestFamily): string {
    return STAR_QUEST_FAMILIES[family]?.hex ?? '#3ECFDC';
  }

  familyRgb(family: StarQuestFamily): string {
    const rgb = STAR_QUEST_FAMILIES[family]?.rgb255 ?? [62, 207, 220];
    return `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`;
  }

  dismiss(): void {
    this.state.clear();
    window.dispatchEvent(new CustomEvent('star-conquest-dismiss'));
  }
}
