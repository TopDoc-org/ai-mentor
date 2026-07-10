import { Component, NgZone, OnInit, inject } from '@angular/core';
import { Location } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { filter } from 'rxjs';
import { ReminderHostComponent } from './shared/reminder-host.component';
import { OnboardingHostComponent } from './shared/onboarding-host.component';
import { AnalyticsService } from './core/analytics.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ReminderHostComponent, OnboardingHostComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly analytics = inject(AnalyticsService);
  private readonly location = inject(Location);
  private readonly zone = inject(NgZone);

  // Top-level screens where the hardware back button should leave the app rather
  // than navigate — going "back" from here has nowhere sensible to land.
  private readonly rootRoutes = new Set(['/', '/dashboard', '/login']);

  ngOnInit(): void {
    // No-op until real Firebase config is provided; safe during prerender.
    this.analytics.init();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.analytics.screenView(e.urlAfterRedirects));

    this.registerBackButton();
  }

  // Android hardware back: without this, Capacitor's default handler exits the
  // app on every press. Instead, navigate back through the app's history and
  // only exit when already at a root screen with nothing to go back to.
  private registerBackButton(): void {
    if (!Capacitor.isNativePlatform()) return;
    // Dynamic import keeps @capacitor/app out of the web/SSR/prerender bundle.
    import('@capacitor/app')
      .then(({ App }) => {
        App.addListener('backButton', ({ canGoBack }) => {
          // The listener fires outside Angular's zone; run inside so router
          // navigation triggers change detection.
          this.zone.run(() => {
            const url = this.router.url.split(/[?#]/)[0];
            if (canGoBack && !this.rootRoutes.has(url)) {
              this.location.back();
            } else {
              App.exitApp();
            }
          });
        });
      })
      .catch(() => {
        /* plugin unavailable — leave default behavior */
      });
  }
}
