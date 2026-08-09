import { NewsItem, NewsSource } from '../../core/models/showcase.model';
import { abbreviateHashesInText } from './showcase-news-display.util';

export type NewsDrawerFieldSection = 'meta' | 'content';

export interface NewsDrawerField {
  id: string;
  section: NewsDrawerFieldSection;
  label: string;
  value: string;
  displayValue: string;
  mono?: boolean;
}

export function formatDrawerPublishedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return abbreviateHashesInText(value);
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month} ${hours}:${minutes}`;
}

export function drawerTargetLabel(item: NewsItem): string {
  if (!item.actionTarget) {
    return '—';
  }

  switch (item.actionType) {
    case 'VIEW_BLOCK':
      return `#${item.actionTarget}`;
    default:
      return abbreviateHashesInText(item.actionTarget);
  }
}

export function drawerTargetFull(item: NewsItem): string {
  if (!item.actionTarget) {
    return '—';
  }

  switch (item.actionType) {
    case 'VIEW_BLOCK':
      return `Bloc #${item.actionTarget}`;
    default:
      return item.actionTarget;
  }
}

export function drawerActionTypeLabel(item: NewsItem): string | null {
  switch (item.actionType) {
    case 'VIEW_BLOCK':
      return 'Voir bloc';
    case 'VIEW_PENDING':
    case 'OPEN_PENDING':
      return 'Pending';
    case 'OPEN_PEERS':
      return 'Peers';
    case 'OPEN_FAUCET':
      return 'Faucet';
    case 'OPEN_SWAP':
      return 'Swap';
    case 'OPEN_WALLET':
      return 'Wallet';
    default:
      return null;
  }
}

export function drawerSourceLabel(source: NewsSource): string {
  switch (source) {
    case 'CHAIN':
      return 'On-chain';
    case 'EDITORIAL':
      return 'Édito';
    default:
      return source;
  }
}

export function formatDrawerFreshPublished(item: NewsItem): {
  value: string;
  displayValue: string;
} {
  const fresh = item.relativeTime?.trim() || '—';
  const published = formatDrawerPublishedAt(item.publishedAt);
  return {
    value: `Publier: ${fresh} · ${published}`,
    displayValue: `${fresh} · ${published}`,
  };
}

export function buildNewsDrawerFields(item: NewsItem): NewsDrawerField[] {
  const summary = item.summary?.trim() || '';
  const body = item.body?.trim() || '';
  const summaryDisplay = abbreviateHashesInText(summary || body || '—');
  const freshPublished = formatDrawerFreshPublished(item);
  const fields: NewsDrawerField[] = [
    {
      id: 'fresh-published',
      section: 'meta',
      label: 'PUBLIER',
      value: freshPublished.value,
      displayValue: freshPublished.displayValue,
    },
    {
      id: 'source',
      section: 'meta',
      label: 'Source',
      value: drawerSourceLabel(item.source),
      displayValue: drawerSourceLabel(item.source),
    },
    {
      id: 'target',
      section: 'meta',
      label: 'Cible',
      value: drawerTargetFull(item),
      displayValue: drawerTargetLabel(item),
      mono: true,
    },
  ];

  const actionLabel = drawerActionTypeLabel(item);
  if (actionLabel) {
    fields.push({
      id: 'action',
      section: 'meta',
      label: 'Action',
      value: actionLabel,
      displayValue: actionLabel,
    });
  }

  fields.push({
    id: 'summary',
    section: 'content',
    label: 'Résumé',
    value: summary || body || '—',
    displayValue: summaryDisplay,
  });

  if (body.length > 0 && body !== summary) {
    fields.push({
      id: 'detail',
      section: 'content',
      label: 'Détail',
      value: body,
      displayValue: abbreviateHashesInText(body),
    });
  }

  fields.push({
    id: 'id',
    section: 'content',
    label: 'ID',
    value: item.id,
    displayValue: abbreviateHashesInText(item.id),
    mono: true,
  });

  return fields;
}
