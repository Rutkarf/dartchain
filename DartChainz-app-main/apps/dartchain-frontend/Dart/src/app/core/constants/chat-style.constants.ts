export type ChatFontKey =
  | 'orbit'
  | 'arial'
  | 'calibri'
  | 'times'
  | 'georgia'
  | 'verdana'
  | 'trebuchet'
  | 'comic'
  | 'courier'
  | 'impact'
  | 'script';

export type ChatBubbleStyleKey = 'neon' | 'polaroid' | 'sticker' | 'retro' | 'minimal';

export interface ChatFontOption {
  key: ChatFontKey;
  label: string;
}

export interface ChatBubbleStyleOption {
  key: ChatBubbleStyleKey;
  label: string;
  preview: string;
}

export const CHAT_FONT_OPTIONS: ChatFontOption[] = [
  { key: 'arial', label: 'Arial' },
  { key: 'calibri', label: 'Calibri' },
  { key: 'times', label: 'Times' },
  { key: 'georgia', label: 'Georgia' },
  { key: 'verdana', label: 'Verdana' },
  { key: 'trebuchet', label: 'Trebuchet' },
  { key: 'comic', label: 'Comic' },
  { key: 'courier', label: 'Courier' },
  { key: 'impact', label: 'Impact' },
  { key: 'script', label: 'Script' },
  { key: 'orbit', label: 'Orbit' },
];

export const CHAT_BUBBLE_STYLE_OPTIONS: ChatBubbleStyleOption[] = [
  { key: 'neon', label: 'Néo', preview: '◆' },
  { key: 'polaroid', label: 'Pol', preview: '▢' },
  { key: 'sticker', label: 'Sti', preview: '★' },
  { key: 'retro', label: 'Rét', preview: '▤' },
  { key: 'minimal', label: 'Min', preview: '○' },
];

export const DEFAULT_CHAT_FONT: ChatFontKey = 'arial';
export const DEFAULT_CHAT_BUBBLE_STYLE: ChatBubbleStyleKey = 'neon';

const FONT_KEYS = new Set(CHAT_FONT_OPTIONS.map((o) => o.key));
const STYLE_KEYS = new Set(CHAT_BUBBLE_STYLE_OPTIONS.map((o) => o.key));

/** @deprecated use arial */
export const normalizeChatFontKey = (value: string | null | undefined): ChatFontKey => {
  if (!value) {
    return DEFAULT_CHAT_FONT;
  }
  const key = value.trim().toLowerCase();
  if (key === 'roboto') {
    return 'arial';
  }
  if (key === 'mono' || key === 'pixel') {
    return key === 'mono' ? 'courier' : 'impact';
  }
  if (FONT_KEYS.has(key as ChatFontKey)) {
    return key as ChatFontKey;
  }
  return DEFAULT_CHAT_FONT;
};

export const normalizeChatBubbleStyleKey = (
  value: string | null | undefined
): ChatBubbleStyleKey => {
  if (value && STYLE_KEYS.has(value as ChatBubbleStyleKey)) {
    return value as ChatBubbleStyleKey;
  }
  return DEFAULT_CHAT_BUBBLE_STYLE;
};
