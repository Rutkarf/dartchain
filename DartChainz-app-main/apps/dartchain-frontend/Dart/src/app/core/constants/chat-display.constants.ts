const GUEST_AUTHOR_PATTERN = /^guest(-\d+)?$/i;

export function isGuestChatAuthor(author: string | null | undefined): boolean {
  const value = (author ?? '').trim();
  return !value || GUEST_AUTHOR_PATTERN.test(value);
}

/** Affichage public : Guest-* → Anonymous */
export function formatChatDisplayName(author: string | null | undefined): string {
  if (isGuestChatAuthor(author)) {
    return 'Anonymous';
  }
  return (author ?? '').trim();
}

export function formatChatMessageTime(sentAt: string | null | undefined): string {
  if (!sentAt) {
    return '';
  }

  const date = new Date(sentAt);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
