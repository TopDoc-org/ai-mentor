import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withPreloading } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { IdlePreloadStrategy } from './core/idle-preload.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding(), withPreloading(IdlePreloadStrategy)),
    // withFetch keeps HTTP working during SSR/prerender; hydration reuses the
    // prerendered DOM on the client instead of re-rendering from scratch.
    provideHttpClient(withInterceptors([authInterceptor]), withFetch()),
    provideClientHydration(),
  ],
};
