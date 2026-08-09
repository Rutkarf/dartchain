import { ErrorHandler, Injectable } from '@angular/core';

function isResizeObserverNoise(error: unknown): boolean {
  const parts: string[] = [];

  if (error instanceof Error) {
    parts.push(error.message);
    if (error.cause) {
      parts.push(String(error.cause));
    }
  } else if (typeof error === 'object' && error !== null && 'message' in error) {
    parts.push(String((error as { message?: unknown }).message ?? ''));
  } else {
    parts.push(String(error ?? ''));
  }

  return parts.some((part) => part.includes('ResizeObserver loop'));
}

@Injectable()
export class ResizeObserverErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    if (isResizeObserverNoise(error)) {
      return;
    }
    console.error(error);
  }
}
