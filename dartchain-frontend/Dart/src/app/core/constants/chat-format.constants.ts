import {
  ChatBubbleStyleKey,
  ChatFontKey,
  DEFAULT_CHAT_BUBBLE_STYLE,
  DEFAULT_CHAT_FONT,
  normalizeChatBubbleStyleKey,
  normalizeChatFontKey,
} from './chat-style.constants';

export type ChatTextAlign = 'left' | 'center' | 'right' | 'justify';

export interface ChatTextFormat {
  fontKey: ChatFontKey;
  fontSize: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  fontColor: string;
  highlightColor: string;
  textAlign: ChatTextAlign;
  styleKey: ChatBubbleStyleKey;
}

export const DEFAULT_CHAT_FORMAT: ChatTextFormat = {
  fontKey: DEFAULT_CHAT_FONT,
  fontSize: '8',
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  fontColor: '#ede7d9',
  highlightColor: 'transparent',
  textAlign: 'right',
  styleKey: DEFAULT_CHAT_BUBBLE_STYLE,
};

/** Styles rapides — un clic dans la barre d’outils */
export const CHAT_FORMAT_STYLE_PRESETS: {
  label: string;
  title: string;
  patch: Partial<ChatTextFormat>;
}[] = [
  {
    label: 'N',
    title: 'Neon — cyan gras',
    patch: { fontColor: '#8b9dad', bold: true, highlightColor: 'transparent' },
  },
  {
    label: '✓',
    title: 'Validé — vert gras',
    patch: { fontColor: '#09814a', bold: true, highlightColor: 'transparent' },
  },
  {
    label: '!',
    title: 'Alerte — orange souligné',
    patch: { fontColor: '#7b0d1e', bold: true, underline: true, highlightColor: 'transparent' },
  },
];

/** Taille unique messages chat (échelle DA — 8px uniquement). */
export const CHAT_FONT_SIZE_OPTIONS = ['8'] as const;

export const CHAT_FONT_COLOR_PRESETS: { label: string; value: string }[] = [
  { label: 'Blanc', value: '#ede7d9' },
  { label: 'Noir', value: '#0a1220' },
  { label: 'Gris', value: '#8b9dad' },
  { label: 'Orange', value: '#7b0d1e' },
  { label: 'Violet', value: '#0a1220' },
  { label: 'Vert', value: '#09814a' },
  { label: 'Cyan', value: '#8b9dad' },
  { label: 'Bleu', value: '#8b9dad' },
  { label: 'Violet', value: '#8b9dad' },
  { label: 'Rose', value: '#ede7d9' },
];

export const CHAT_HIGHLIGHT_PRESETS: { label: string; value: string }[] = [
  { label: 'Aucun', value: 'transparent' },
  { label: 'Violet sombre', value: '#0a1220' },
  { label: 'Vert', value: '#09814a' },
  { label: 'Cyan', value: '#ede7d9' },
  { label: 'Rose', value: '#7b0d1e' },
  { label: 'Gris', value: '#ede7d9' },
];

/** Grille thème type Word — 10 colonnes */
export const CHAT_THEME_COLOR_GRID: string[] = [
  '#0a1220',
  '#8b9dad',
  '#7b0d1e',
  '#8b9dad',
  '#7b0d1e',
  '#0a1220',
  '#09814a',
  '#8b9dad',
  '#8b9dad',
  '#8b9dad',
  '#ede7d9',
  '#ede7d9',
  '#7b0d1e',
  '#7b0d1e',
  '#0a1220',
  '#0a1220',
  '#09814a',
  '#ede7d9',
  '#8b9dad',
  '#ede7d9',
  '#ede7d9',
  '#ede7d9',
  '#ede7d9',
  '#ede7d9',
  '#0a1220',
  '#ede7d9',
  '#ede7d9',
  '#ede7d9',
  '#ede7d9',
  '#8b9dad',
  '#7b0d1e',
  '#09814a',
  '#8b9dad',
  '#8b9dad',
  '#8b9dad',
  '#ede7d9',
  '#0a1220',
  '#235789',
  '#8b9dad',
  '#7b0d1e',
  '#8b9dad',
  '#0a1220',
  '#8b9dad',
  '#09814a',
];

export const CHAT_THEME_HIGHLIGHT_GRID: string[] = [
  'transparent',
  '#0a1220',
  '#09814a',
  '#8b9dad',
  '#8b9dad',
  '#7b0d1e',
  '#235789',
  '#235789',
  '#7b0d1e',
  '#7b0d1e',
  '#0a1220',
  '#09814a',
  '#09814a',
  '#ede7d9',
  '#ede7d9',
  '#8b9dad',
  '#0a1220',
  '#09814a',
  '#ede7d9',
  '#7b0d1e',
  '#0a1220',
  '#ede7d9',
  '#ede7d9',
  '#0a1220',
];

export const CHAT_ALIGN_OPTIONS: { value: ChatTextAlign; label: string }[] = [
  { value: 'left', label: '◧' },
  { value: 'center', label: '◆' },
  { value: 'right', label: '◨' },
  { value: 'justify', label: '≡' },
];

const FONT_SIZE_SET = new Set<string>(CHAT_FONT_SIZE_OPTIONS);
const ALIGN_SET = new Set<ChatTextAlign>(['left', 'center', 'right', 'justify']);
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export function normalizeFontSize(value: string | null | undefined): string {
  if (value && FONT_SIZE_SET.has(value)) {
    return value;
  }
  return DEFAULT_CHAT_FORMAT.fontSize;
}

export function normalizeTextAlign(value: string | null | undefined): ChatTextAlign {
  if (value && ALIGN_SET.has(value as ChatTextAlign)) {
    return value as ChatTextAlign;
  }
  return DEFAULT_CHAT_FORMAT.textAlign;
}

export function normalizeHexColor(
  value: string | null | undefined,
  fallback: string
): string {
  if (!value || value === 'transparent') {
    return value === 'transparent' ? 'transparent' : fallback;
  }
  const trimmed = value.trim();
  if (trimmed === 'transparent') {
    return 'transparent';
  }
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return HEX_COLOR.test(withHash) ? withHash.toLowerCase() : fallback;
}

export function normalizeChatTextFormat(
  partial: Partial<ChatTextFormat> | null | undefined
): ChatTextFormat {
  if (!partial) {
    return { ...DEFAULT_CHAT_FORMAT };
  }

  return {
    fontKey: normalizeChatFontKey(partial.fontKey),
    fontSize: normalizeFontSize(partial.fontSize),
    bold: !!partial.bold,
    italic: !!partial.italic,
    underline: !!partial.underline,
    strikethrough: !!partial.strikethrough,
    fontColor: normalizeHexColor(partial.fontColor, DEFAULT_CHAT_FORMAT.fontColor),
    highlightColor: normalizeHexColor(
      partial.highlightColor,
      DEFAULT_CHAT_FORMAT.highlightColor
    ),
    textAlign: normalizeTextAlign(partial.textAlign),
    styleKey: normalizeChatBubbleStyleKey(partial.styleKey),
  };
}

export function formatFromMessage(msg: {
  fontKey?: string;
  fontSize?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontColor?: string;
  highlightColor?: string;
  textAlign?: string;
  styleKey?: string;
}): ChatTextFormat {
  return normalizeChatTextFormat({
    fontKey: msg.fontKey as ChatFontKey,
    fontSize: msg.fontSize,
    bold: msg.bold,
    italic: msg.italic,
    underline: msg.underline,
    strikethrough: msg.strikethrough,
    fontColor: msg.fontColor,
    highlightColor: msg.highlightColor,
    textAlign: msg.textAlign as ChatTextAlign,
    styleKey: msg.styleKey as ChatBubbleStyleKey,
  });
}

const FONT_FAMILY_BY_KEY: Record<string, string> = {
  orbit: 'var(--chat-font-orbit)',
  arial: 'var(--chat-font-arial)',
  calibri: 'var(--chat-font-calibri)',
  times: 'var(--chat-font-times)',
  georgia: 'var(--chat-font-georgia)',
  verdana: 'var(--chat-font-verdana)',
  trebuchet: 'var(--chat-font-trebuchet)',
  comic: 'var(--chat-font-comic)',
  courier: 'var(--chat-font-courier)',
  impact: 'var(--chat-font-impact)',
  script: 'var(--chat-font-script)',
};

export function textNgStyle(format: ChatTextFormat): Record<string, string> {
  return buildTextNgStyle(format, { includeAlign: true, includeFontSize: true });
}

export function textNgStyleForLine(format: ChatTextFormat): Record<string, string> {
  const style = buildTextNgStyle(format, { includeAlign: false, includeFontSize: false });
  return style;
}

function buildTextNgStyle(
  format: ChatTextFormat,
  options: { includeAlign: boolean; includeFontSize?: boolean }
): Record<string, string> {
  const decorations: string[] = [];
  if (format.underline) {
    decorations.push('underline');
  }
  if (format.strikethrough) {
    decorations.push('line-through');
  }

  const style: Record<string, string> = {
    fontFamily: FONT_FAMILY_BY_KEY[format.fontKey] ?? 'var(--font-body)',
    fontWeight: format.bold ? '800' : '600',
    fontStyle: format.italic ? 'italic' : 'normal',
    color: format.fontColor,
  };

  if (options.includeFontSize !== false) {
    // Échelle DA : une seule taille message = 8px (--fs-chat-msg)
    style['fontSize'] = 'var(--fs-chat-msg)';
  }

  if (options.includeAlign) {
    style['textAlign'] = format.textAlign;
  }

  if (decorations.length > 0) {
    style['textDecoration'] = decorations.join(' ');
  } else {
    style['textDecoration'] = 'none';
  }

  if (format.highlightColor && format.highlightColor !== 'transparent') {
    style['backgroundColor'] = format.highlightColor;
    style['borderRadius'] = 'var(--radius-xs)';
    style['padding'] = '0 2px';
  }

  return style;
}
