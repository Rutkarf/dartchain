import { NewsItem } from '@core/models/showcase.model';

export type NewsTimeGroupKey = 'instant' | 'hour' | 'today' | 'yesterday' | 'earlier';

export interface NewsTimeGroup {
  key: NewsTimeGroupKey;
  label: string;
  items: NewsItem[];
}

const GROUP_LABELS: Record<NewsTimeGroupKey, string> = {
  instant: "À l'instant",
  hour: 'Cette heure',
  today: "Aujourd'hui",
  yesterday: 'Hier',
  earlier: 'Plus tôt',
};

const HASH_PATTERN = /\b([a-f0-9]{12,})\b/gi;

export function normalizeNewsCategorySlug(category: string): string {
  return category
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function newsCategoryAbbrev(category: string, source?: NewsItem['source']): string {
  if (source === 'EDITORIAL') {
    return 'INFO';
  }

  switch (category.toLowerCase()) {
    case 'réseau':
      return 'NET';
    case 'peers':
      return 'P2P';
    case 'r4v3':
      return 'R4';
    case 'écosystème':
    case 'd.a.o':
      return 'DAO';
    default:
      return category.slice(0, 3).toUpperCase() || '•';
  }
}

export function displayNewsCategoryLabel(
  category: string,
  source: NewsItem['source'],
  fallbackLabel: string
): string {
  if (source === 'EDITORIAL') {
    return 'INFO';
  }
  return fallbackLabel;
}

export function abbreviateHashesInText(text: string): string {
  return text.replace(HASH_PATTERN, (hash) => `${hash.slice(0, 4)}…${hash.slice(-4)}`);
}

export function formatNewsDisplayTitle(item: NewsItem): string {
  const blockIndex =
    item.actionTarget ??
    item.title.match(/#(\d+)/)?.[1] ??
    item.title.match(/bloc\s*#?\s*(\d+)/i)?.[1];

  switch (item.actionType) {
    case 'VIEW_BLOCK':
      if (blockIndex) {
        return `Bloc #${blockIndex} confirmé`;
      }
      break;
    case 'VIEW_PENDING':
    case 'OPEN_PENDING':
      if (/pending|attente/i.test(item.title)) {
        return abbreviateHashesInText(item.title.replace(/Transaction pending/i, 'TX pending'));
      }
      return abbreviateHashesInText(
        item.actionTarget ? `TX pending · ${item.actionTarget}` : `TX pending`
      );
    case 'OPEN_PEERS':
      if (/peer|nœud|node/i.test(item.title)) {
        return item.title;
      }
      return 'Peers réseau mis à jour';
    case 'OPEN_FAUCET':
      return item.title.includes('faucet') ? item.title : 'Faucet disponible';
    case 'OPEN_SWAP':
      if (/swap/i.test(item.title)) {
        return item.title;
      }
      return 'Swap exécuté sur le testnet';
    case 'OPEN_WALLET':
      return item.title;
    default:
      break;
  }

  if (item.source === 'EDITORIAL' && /bienvenue/i.test(item.title)) {
    return 'Bienvenue sur Dart Explorer';
  }

  return abbreviateHashesInText(item.title);
}

export function newsDisplayTitleTooltip(item: NewsItem): string {
  return item.title.trim();
}

export function resolveNewsTimeGroup(
  publishedAt: string,
  now = Date.now()
): NewsTimeGroupKey {
  const ts = Date.parse(publishedAt);
  if (Number.isNaN(ts)) {
    return 'earlier';
  }

  const diffMin = (now - ts) / 60_000;
  if (diffMin < 5) {
    return 'instant';
  }
  if (diffMin < 60) {
    return 'hour';
  }

  const nowDate = new Date(now);
  const startOfToday = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate()
  ).getTime();
  const startOfYesterday = startOfToday - 86_400_000;

  if (ts >= startOfToday) {
    return 'today';
  }
  if (ts >= startOfYesterday) {
    return 'yesterday';
  }
  return 'earlier';
}

export function groupNewsItemsInOrder(
  items: NewsItem[],
  now = Date.now()
): NewsTimeGroup[] {
  const groups: NewsTimeGroup[] = [];
  let current: NewsTimeGroup | null = null;

  for (const item of items) {
    const key = resolveNewsTimeGroup(item.publishedAt, now);
    if (!current || current.key !== key) {
      current = { key, label: GROUP_LABELS[key], items: [] };
      groups.push(current);
    }
    current.items.push(item);
  }

  return groups;
}
