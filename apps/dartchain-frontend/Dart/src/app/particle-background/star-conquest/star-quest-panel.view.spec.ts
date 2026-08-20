import {
  STAR_QUEST_CLAIM_ERROR_MESSAGE,
  buildStarQuestPanelView,
  starQuestCtaEnabled,
  starQuestCtaLabel,
  starQuestHint,
} from './star-quest-panel.view';
import { starQuestById } from './star-conquest.mock';
import { starConquestLiveLink } from './star-conquest-live';

describe('Star quest panel view-model', () => {
  it('keeps preview CTA distinct from live Dock actions', () => {
    const preview = starQuestById('sc-angular-layout');
    const live = starQuestById('sc-swap-confirm');
    expect(preview).toBeTruthy();
    expect(live).toBeTruthy();
    if (!preview || !live) return;

    const previewView = buildStarQuestPanelView({
      quest: preview,
      x: 0,
      y: 0,
      compact: false,
      live: undefined,
      liveTask: undefined,
      playerClaimed: false,
      previewM4T3R: 0,
    });
    expect(previewView.ctaLabel).toBe('Conquérir');
    expect(previewView.ctaEnabled).toBe(true);
    expect(previewView.hint).toContain('pas de crédit faucet');
    expect(previewView.rewardValue).toContain('M4T3R');

    const liveLink = starConquestLiveLink(live.id);
    const liveView = buildStarQuestPanelView({
      quest: live,
      x: 0,
      y: 0,
      compact: false,
      live: liveLink,
      liveTask: undefined,
      playerClaimed: false,
      previewM4T3R: 0,
    });
    expect(liveView.live).toBe(true);
    expect(liveView.ctaLabel).toBe(liveLink?.ctaLabel);
    expect(liveView.hint).toContain('pas de clic magique');
  });

  it('disables locked and future CTAs', () => {
    expect(starQuestCtaEnabled('locked', undefined)).toBe(false);
    expect(starQuestCtaLabel('locked', undefined)).toBe('À débloquer');
    expect(starQuestCtaEnabled('future', undefined)).toBe(false);
    expect(starQuestHint({ live: false, kind: 'locked', playerClaimed: false, previewM4T3R: 0 }))
      .toContain('voisin');
  });

  it('maps claim failures to user messages', () => {
    expect(STAR_QUEST_CLAIM_ERROR_MESSAGE['action-required']).toContain('pas de clic magique');
    expect(STAR_QUEST_CLAIM_ERROR_MESSAGE.locked).toContain('voisin');
  });
});
