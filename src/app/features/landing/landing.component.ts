import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ThemeService } from '../../core/theme.service';
import { SeoService } from '../../core/seo.service';
import { AnalyticsService } from '../../core/analytics.service';
import { AnalyticsEvent } from '../../core/analytics-events';
import { OnboardingService } from '../../core/onboarding.service';
import { FooterComponent } from '../../shared/footer.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FooterComponent],
  template: `
    <div class="min-h-screen flex flex-col">
      <!-- Nav -->
      <nav class="flex items-center justify-between px-4 md:px-6 lg:px-8 py-4 md:py-5 max-w-6xl mx-auto w-full">
        <div class="flex items-center gap-2.5">
          <img src="icon.svg" alt="" class="h-8 w-8 md:h-9 md:w-9 rounded-xl object-cover">
          <span class="text-heading md:text-display font-brand text-white tracking-tight">Zenamaze</span>
        </div>
        <div class="flex items-center gap-3">
          <button (click)="theme.toggle()"
             class="h-8 w-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-slate-200 hover:bg-white/20 transition-all shrink-0"
             [attr.aria-label]="theme.isLight() ? 'Switch to dark mode' : 'Switch to light mode'">
            @if (theme.isLight()) {
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            } @else {
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            }
          </button>
          <a *ngIf="!auth.isAuthed()" routerLink="/login" class="text-body-sm text-slate-300 hover:text-white font-medium">Log in</a>
          <a *ngIf="auth.isAuthed()" routerLink="/dashboard" class="btn-ghost text-sm !py-2 !px-4">Dashboard →</a>
        </div>
      </nav>

      <!-- Hero -->
      <div class="flex-1 flex items-center">
        <div class="max-w-3xl mx-auto px-4 md:px-6 text-center py-12 md:py-16 lg:py-20">
          <span class="chip mx-auto mb-6 md:mb-7 animate-fade-up">◆ Built for people who want to actually get there</span>

          <h1 class="font-heading text-display-xl md:text-display-2xl lg:text-6xl xl:text-7xl leading-[1.03] text-white animate-fade-up" style="animation-delay:60ms">
            One big goal.<br />
            <span class="accent-text">One move today.</span>
          </h1>

          <p class="text-body md:text-body-lg text-slate-300/80 mt-6 md:mt-7 max-w-2xl mx-auto animate-fade-up" style="animation-delay:120ms">
            Tell Zenamaze what you want. It digs until it finds the real reason, builds the system,
            and hands you a single daily action — then makes it hurt to skip.
          </p>

          <!-- Inline start -->
          <div class="glass-strong p-2 mt-8 md:mt-10 max-w-lg md:max-w-xl mx-auto flex flex-col sm:flex-row gap-2 animate-fade-up" style="animation-delay:180ms">
            <input
              id="landingGoalInput"
              class="flex-1 bg-transparent px-4 py-3 md:py-3.5 text-slate-100 placeholder:text-slate-400 outline-none"
              [(ngModel)]="goal" name="goal"
              (keydown.enter)="start()"
              placeholder="What do you want to achieve?" />
            <button class="btn-primary shrink-0" (click)="start()" [disabled]="!goal.trim() || loading()">
              {{ loading() ? 'Starting…' : 'Start free →' }}
            </button>
          </div>
          <p class="text-caption text-slate-400 mt-3 animate-fade-up" style="animation-delay:220ms">
            No signup to try. Create an account only when you want to save your plan.
          </p>

          <!-- Proof points -->
          <div class="flex flex-wrap justify-center gap-2 md:gap-3 mt-10 md:mt-14 animate-fade-up" style="animation-delay:260ms">
            <span class="chip">🎯 Goal → daily habit</span>
            <span class="chip">🔥 Streaks you won't want to break</span>
            <span class="chip">🧠 A coach that asks the hard questions</span>
            <span class="chip">📈 Momentum you can see</span>
          </div>
        </div>
      </div>

      <app-footer />
    </div>
  `,
})
export class LandingComponent implements OnInit {
  theme = inject(ThemeService);
  private seo = inject(SeoService);
  private analytics = inject(AnalyticsService);
  private onboarding = inject(OnboardingService);
  goal = '';
  loading = signal(false);

  constructor(private api: ApiService, public auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Zenamaze — Turn one big goal into one move today',
      description:
        'Zenamaze turns one big goal into a single daily action. An AI coach that finds your real why, builds the system, and keeps you moving with streaks and reminders.',
      keywords:
        'goal setting app, daily habit tracker, productivity coach, AI accountability, focus timer, streaks',
      path: '/',
    });
    this.seo.setJsonLd('ld-app', {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Zenamaze',
      applicationCategory: 'LifestyleApplication',
      operatingSystem: 'Android, Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      description:
        'Turn one big goal into a single daily action with an AI coach, streaks and reminders.',
    });
    // First-open guided run: show Pip's welcome dialog once, to signed-out
    // first-timers (the host renders it).
    this.onboarding.maybeShowWelcome();
  }

  start() {
    const title = this.goal.trim();
    if (!title || this.loading()) return;
    this.loading.set(true);
    this.analytics.logEvent(AnalyticsEvent.GuestGoalStarted);
    this.api.createGuestGoal(title).subscribe({
      next: (g) => this.router.navigate(['/try', g.goalId]),
      error: () => this.loading.set(false),
    });
  }
}
