const GUEST_AUTHOR_PATTERN = /^(guest(-\d+)?|anonymous)$/i;

/** Auteur technique pour les posts anonymes. */
export const CHAT_ANONYMOUS_AUTHOR = 'Anonymous';

export function isGuestChatAuthor(author: string | null | undefined): boolean {
  const value = (author ?? '').trim();
  return !value || GUEST_AUTHOR_PATTERN.test(value);
}

/** Affichage public : Guest-* / Anonymous → Anonymous */
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

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const sat = s / 100;
  const light = l / 100;
  const chroma = (1 - Math.abs(2 * light - 1)) * sat;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - chroma / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = chroma;
    g = x;
  } else if (h < 120) {
    r = x;
    g = chroma;
  } else if (h < 180) {
    g = chroma;
    b = x;
  } else if (h < 240) {
    g = x;
    b = chroma;
  } else if (h < 300) {
    r = x;
    b = chroma;
  } else {
    r = chroma;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/** Teinte stable par message (haut-gauche du dégradé). */
export function chatLineGradientStyle(messageId: string): Record<string, string> {
  let hash = 2166136261;
  for (let i = 0; i < messageId.length; i++) {
    hash ^= messageId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const hue = (hash >>> 0) % 360;
  const sat = 44 + ((hash >>> 8) % 26);
  const light = 40 + ((hash >>> 16) % 16);
  const { r, g, b } = hslToRgb(hue, sat, light);

  return {
    '--chat-line-tint-r': String(r),
    '--chat-line-tint-g': String(g),
    '--chat-line-tint-b': String(b),
  };
}
