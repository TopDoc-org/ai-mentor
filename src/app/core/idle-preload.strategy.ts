import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';

// Preload lazy route chunks during browser idle time instead of eagerly
// (PreloadAllModules) or never (no strategy). First navigation stays lean; once
// the browser is idle we prefetch the rest so later navigations are instant.
//
// Skips: SSR/prerender (no requestIdleCallback, and preloading server-side is
// pointless), and any route marked `data: { preload: false }` (e.g. heavy or
// rarely-hit screens you'd rather load on demand).
@Injectable({ providedIn: 'root' })
export class IdlePreloadStrategy implements PreloadingStrategy {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    if (!this.isBrowser || route.data?.['preload'] === false) return of(null);

    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
    };
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(() => load().subscribe(), { timeout: 5000 });
    } else {
      // Safari/older: no requestIdleCallback — fall back to a short defer so it
      // still runs after the initial render, not during it.
      setTimeout(() => load().subscribe(), 2000);
    }
    return of(null);
  }
}
