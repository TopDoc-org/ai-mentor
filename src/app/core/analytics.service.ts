import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { isBrowser } from './platform';
import { AnalyticsEventName } from './analytics-events';

type Params = Record<string, string | number | boolean | undefined>;

// Thin wrapper over Firebase Analytics (Google Analytics 4). Firebase is lazily
// imported so it never bloats the initial bundle nor runs during prerender.
//
// No-op by design when: not in a browser (SSR/prerender), or the Firebase config
// still holds placeholder values. This lets the app ship and build today; drop
// real keys into environment.*.ts and events start flowing with no code change.
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private analytics: import('firebase/analytics').Analytics | null = null;
  private started = false;
  private queue: Array<() => void> = [];

  init(): void {
    if (this.started || !isBrowser) return;
    const cfg = environment.firebase;
    if (!cfg?.apiKey || !cfg?.measurementId) return; // placeholders → stay a no-op
    this.started = true;

    Promise.all([import('firebase/app'), import('firebase/analytics')])
      .then(async ([app, analytics]) => {
        if (!(await analytics.isSupported())) return;
        const firebaseApp = app.getApps().length ? app.getApp() : app.initializeApp(cfg);
        this.analytics = analytics.getAnalytics(firebaseApp);
        this.flush();
      })
      .catch(() => {
        /* analytics is best-effort — never break the app over it */
      });
  }

  logEvent(name: AnalyticsEventName, params?: Params): void {
    this.run(async () => {
      const { logEvent } = await import('firebase/analytics');
      // firebase's logEvent has a stricter event-name union than our custom
      // AnalyticsEventName; analytics is best-effort, so widen the call.
      (logEvent as (...args: unknown[]) => void)(this.analytics!, name, this.clean(params));
    });
  }

  screenView(screenName: string): void {
    this.run(async () => {
      const { logEvent } = await import('firebase/analytics');
      (logEvent as (...args: unknown[]) => void)(this.analytics!, 'screen_view', { screen_name: screenName });
    });
  }

  setUser(userId: string | null): void {
    this.run(async () => {
      const { setUserId } = await import('firebase/analytics');
      setUserId(this.analytics!, userId);
    });
  }

  // Queue calls made before Firebase finishes loading, then replay in order.
  private run(fn: () => void): void {
    if (!isBrowser) return;
    if (this.analytics) fn();
    else if (this.started) this.queue.push(fn);
  }

  private flush(): void {
    const pending = this.queue;
    this.queue = [];
    for (const fn of pending) fn();
  }

  private clean(params?: Params): Params {
    if (!params) return {};
    return Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined),
    ) as Params;
  }
}
