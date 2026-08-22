import type { LocaleKey } from '../../core/i18n/locale.messages';

export interface AuthOAuthProviderView {
  id: string;
  labelKey: LocaleKey;
}

export const AUTH_OAUTH_PROVIDERS: AuthOAuthProviderView[] = [
  { id: 'google', labelKey: 'auth.google' },
  { id: 'meta', labelKey: 'auth.meta' },
  { id: 'apple', labelKey: 'auth.apple' },
  { id: 'microsoft', labelKey: 'auth.microsoft' },
  { id: 'github', labelKey: 'auth.github' },
  { id: 'x', labelKey: 'auth.x' },
  { id: 'discord', labelKey: 'auth.discord' },
];
