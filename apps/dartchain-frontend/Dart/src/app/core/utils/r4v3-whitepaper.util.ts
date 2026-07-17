import {
  R4V3_WHITEPAPER_TXT_FILENAME,
  R4V3_WHITEPAPER_TXT_URL,
} from '../constants/r4v3-token.constants';

export interface R4v3WhitepaperResult {
  ok: boolean;
  message?: string;
}

/** Ouvre le white paper dans un nouvel onglet et déclenche le téléchargement .txt. */
export async function openR4v3Whitepaper(): Promise<R4v3WhitepaperResult> {
  try {
    const response = await fetch(R4V3_WHITEPAPER_TXT_URL, { cache: 'no-store' });
    if (!response.ok) {
      return { ok: false, message: 'White paper indisponible' };
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    window.open(objectUrl, '_blank', 'noopener,noreferrer');

    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = R4V3_WHITEPAPER_TXT_FILENAME;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return { ok: true };
  } catch {
    return { ok: false, message: 'White paper inaccessible' };
  }
}
