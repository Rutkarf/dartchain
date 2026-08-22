import { STAR_CONQUEST_MOCK_QUESTS } from './star-conquest.mock';
import { isStarConquestLiveQuest } from './star-conquest-live';
import {
  STAR_CONQUEST_GITHUB_COLUMN,
  starConquestGithubColumn,
  type StarConquestGithubBoardCard,
  type StarConquestGithubColumn,
} from './star-conquest-github-project';

describe('Star Conquest GitHub project board', () => {
  it('mappe chaque statut catalogue vers une colonne GitHub', () => {
    expect(STAR_CONQUEST_GITHUB_COLUMN.completed).toBe('Done');
    expect(STAR_CONQUEST_GITHUB_COLUMN.active).toBe('In Progress');
    expect(STAR_CONQUEST_GITHUB_COLUMN.available).toBe('Ready');
    expect(STAR_CONQUEST_GITHUB_COLUMN.locked).toBe('Blocked');
    expect(STAR_CONQUEST_GITHUB_COLUMN.future).toBe('Icebox');
  });

  it('place les cartes shippées en Done et les live en Ready', () => {
    const cards: StarConquestGithubBoardCard[] = STAR_CONQUEST_MOCK_QUESTS.map((q) => ({
      id: q.id,
      title: q.title,
      column: starConquestGithubColumn(q.status),
      family: q.family,
      live: isStarConquestLiveQuest(q.id),
    }));

    const byColumn = (col: StarConquestGithubColumn) =>
      cards.filter((c) => c.column === col).map((c) => c.id);

    expect(byColumn('Done')).toEqual(
      expect.arrayContaining([
        'sc-responsive-250',
        'sc-angular-layout',
        'sc-three-raycast',
        'sc-three-depth',
        'sc-three-fps',
        'sc-map-wigle',
        'sc-admin-gate',
        'sc-gamify-map',
        'sc-dock-quests',
      ])
    );
    expect(byColumn('Blocked')).toEqual(['sc-security-tx']);
    expect(byColumn('Icebox')).toEqual(['sc-data-persist']);
    expect(byColumn('In Progress')).toEqual(
      expect.arrayContaining(['sc-swap-slippage', 'sc-data-rates'])
    );

    for (const card of cards.filter((c) => c.live)) {
      expect(card.column).toBe('Ready');
    }
  });
});
