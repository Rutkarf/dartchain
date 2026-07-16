import { HttpBackend, HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';

import {
  readStoredAuthToken,
  isAccessTokenExpired,
} from '../auth/auth-session.storage';
import {
  refreshAccessToken,
  shouldAttemptTokenRefresh,
} from '../auth/auth-token-refresh';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const httpBackend = inject(HttpBackend);
  const token = readStoredAuthToken();
  const authorizedRequest = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : req;

  const send = (request = authorizedRequest) => {
    if (isAccessTokenExpired() && !request.url.includes('/auth/refresh')) {
      return from(refreshAccessToken(httpBackend)).pipe(
        switchMap((newToken) => {
          if (!newToken) {
            return next(request);
          }

          return next(
            req.clone({
              setHeaders: {
                Authorization: `Bearer ${newToken}`,
              },
            })
          );
        })
      );
    }

    return next(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (!shouldAttemptTokenRefresh(req.url, error.status)) {
          return throwError(() => error);
        }

        return from(refreshAccessToken(httpBackend)).pipe(
          switchMap((newToken) => {
            if (!newToken) {
              return throwError(() => error);
            }

            return next(
              req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`,
                },
              })
            );
          })
        );
      })
    );
  };

  return send();
};
