/**
 * Copie texte dans le presse-papier avec fallback execCommand.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  const value = text.trim();
  if (!value) {
    return false;
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fallback ci-dessous (contexte non sécurisé, permissions, etc.)
    }
  }

  if (typeof document === 'undefined') {
    return false;
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

export function buildNewsCopyText(item: {
  title: string;
  summary?: string;
  body?: string;
  category?: string;
  relativeTime?: string;
  source?: string;
}): string {
  const parts = [item.title.trim()];
  const summary = item.summary?.trim();
  const body = item.body?.trim();

  if (summary) {
    parts.push('', summary);
  }

  if (body && body !== summary) {
    parts.push('', body);
  }

  const meta: string[] = [];
  if (item.category) {
    meta.push(item.category);
  }
  if (item.relativeTime) {
    meta.push(item.relativeTime);
  }
  if (item.source) {
    meta.push(item.source);
  }

  if (meta.length > 0) {
    parts.push('', meta.join(' · '));
  }

  return parts.join('\n').trim();
}
