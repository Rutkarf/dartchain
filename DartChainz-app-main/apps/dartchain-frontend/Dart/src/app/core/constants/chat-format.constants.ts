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
  fontSize: '11',
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  fontColor: '#f4f0ff',
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
    patch: { fontColor: '#5ce1ff', bold: true, highlightColor: 'transparent' },
  },
  {
    label: '✓',
    title: 'Validé — vert gras',
    patch: { fontColor: '#5dffb1', bold: true, highlightColor: 'transparent' },
  },
  {
    label: '!',
    title: 'Alerte — orange souligné',
    patch: { fontColor: '#ff9f43', bold: true, underline: true, highlightColor: 'transparent' },
  },
];

export const CHAT_FONT_SIZE_OPTIONS = [
  '8',
  '9',
  '10',
  '11',
  '12',
  '14',
  '16',
  '18',
  '20',
  '22',
  '24',
  '26',
  '28',
  '36',
  '48',
  '72',
] as const;

export const CHAT_FONT_COLOR_PRESETS: { label: string; value: string }[] = [
  { label: 'Blanc', value: '#f4f0ff' },
  { label: 'Noir', value: '#0a0a12' },
  { label: 'Gris', value: '#8b9dad' },
  { label: 'Orange', value: '#ff9f43' },
  { label: 'Violet', value: '#120a1e' },
  { label: 'Vert', value: '#5dffb1' },
  { label: 'Cyan', value: '#5ce1ff' },
  { label: 'Bleu', value: '#6b8cff' },
  { label: 'Violet', value: '#c77dff' },
  { label: 'Rose', value: '#ff6bcb' },
];

export const CHAT_HIGHLIGHT_PRESETS: { label: string; value: string }[] = [
  { label: 'Aucun', value: 'transparent' },
  { label: 'Violet sombre', value: '#120a1e' },
  { label: 'Vert', value: '#b9f6ca' },
  { label: 'Cyan', value: '#84ffff' },
  { label: 'Rose', value: '#f8bbd0' },
  { label: 'Gris', value: '#cfd8dc' },
];

/** Grille thème type Word — 10 colonnes */
export const CHAT_THEME_COLOR_GRID: string[] = [
  '#000000',
  '#7f7f7f',
  '#880015',
  '#8b9dad',
  '#ff7f27',
  '#120a1e',
  '#22b14c',
  '#00a2e8',
  '#3f48cc',
  '#a349a4',
  '#ffffff',
  '#c3c3c3',
  '#b97a57',
  '#ffaec9',
  '#120a1e',
  '#1a1028',
  '#b5e61d',
  '#99d9ea',
  '#7092be',
  '#c8bfe7',
  '#f4f0ff',
  '#e6e6e6',
  '#daeef3',
  '#fde9d9',
  '#120a1e',
  '#d9ead3',
  '#cfe2f3',
  '#d0e0e3',
  '#ead1dc',
  '#8b9dad',
  '#ff9f43',
  '#5dffb1',
  '#5ce1ff',
  '#6b8cff',
  '#c77dff',
  '#ff6bcb',
  '#0a0a12',
  '#44546a',
  '#4472c4',
  '#ed7d31',
  '#a5a5a5',
  '#120a1e',
  '#5b9bd5',
  '#70ad47',
];

export const CHAT_THEME_HIGHLIGHT_GRID: string[] = [
  'transparent',
  '#120a1e',
  '#00ff00',
  '#00ffff',
  '#ff00ff',
  '#ff0000',
  '#0000ff',
  '#000080',
  '#800080',
  '#800000',
  '#1a1028',
  '#008000',
  '#008080',
  '#ffffff',
  '#c0c0c0',
  '#808080',
  '#120a1e',
  '#b9f6ca',
  '#84ffff',
  '#f8bbd0',
  '#1a1028',
  '#d1c4e9',
  '#b3e5fc',
  '#120a1e',
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
    style['fontSize'] = `clamp(${Math.max(5, Number(format.fontSize) * 0.45)}px, ${Number(format.fontSize) * 0.55}vw, ${format.fontSize}px)`;
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
    style['borderRadius'] = '2px';
    style['padding'] = '0 2px';
  }

  return style;
}
