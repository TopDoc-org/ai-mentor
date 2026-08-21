import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { OnboardingService } from '../core/onboarding.service';
import { AuthService } from '../core/auth.service';
import { isBrowser } from '../core/platform';
import { PIP } from '../core/onboarding-script';
import { PipMascotComponent } from './pip-mascot.component';

// Global, always-mounted host for the Pip-guided first run. Renders whichever
// beat the OnboardingService is on, aware of the current route so the same step
// can look different on the dashboard (a "let's go" card) vs on the target
// screen (a slim, non-blocking coach banner that leaves the create form usable).
//
// Mounted once in app.component.html — never per-feature — so it survives route
// changes and the guest→account boundary without re-mounting.
type View =
  | 'welcome'
  | 'discovery-hint'
  | 'todo-intro'
  | 'todo-coach'
  | 'reminder-intro'
  | 'reminder-coach'
  | 'graduate'
  | null;

@Component({
  selector: 'app-onboarding-host',
  standalone: true,
  imports: [CommonModule, PipMascotComponent],
  template: `
    @switch (view()) {
      <!-- Beat 0: first-open welcome (centered dialog) -->
      @case ('welcome') {
        <div class="ob-scrim flex items-center justify-center p-4">
          <div class="glass-strong w-full max-w-sm rounded-3xl p-6 animate-pop text-center" role="dialog" aria-modal="true" aria-labelledby="obWelcomeTitle">
            <div class="flex justify-center mb-3"><app-pip [size]="64" /></div>
            <h2 id="obWelcomeTitle" class="text-heading-xl text-white mb-2">{{ s.welcome.title }}</h2>
            <p class="text-body-sm text-slate-300 mb-3 leading-relaxed">{{ s.welcome.body }}</p>
            <p class="text-caption text-accent-soft mb-6 leading-relaxed">{{ s.welcome.warning }}</p>
            <button class="btn-primary w-full mb-2" (click)="chooseNew()">{{ s.welcome.newBtn }}</button>
            <button class="btn-ghost w-full text-sm" (click)="chooseReturning()">{{ s.welcome.returningBtn }}</button>
          </div>
        </div>
      }

      <!-- Beat 1: after "I'm new", a slim banner pointing at the goal box -->
      @case ('discovery-hint') {
        <div class="ob-coach animate-fade-up">
          <app-pip [size]="40" />
          <p class="text-body-sm text-white flex-1 min-w-0">{{ s.startHint }}</p>
        </div>
      }

      <!-- Beat 3a: first to-do — intro card on the dashboard. Skippable: the goal
           + plan are already saved; only the demo is optional. -->
      @case ('todo-intro') {
        <div class="ob-scrim ob-scrim-soft flex items-end sm:items-center justify-center p-4">
          <div class="glass-strong w-full max-w-sm rounded-3xl p-6 animate-pop" role="dialog" aria-modal="true">
            <div class="flex items-start gap-3 mb-4">
              <app-pip [size]="52" mood="celebrate" />
              <div class="min-w-0">
                <p class="pip-name">{{ s.name }} · Step 1 of 2</p>
                <h3 class="text-heading text-white leading-snug">{{ s.tour.todoIntro.title }}</h3>
              </div>
            </div>
            <p class="text-body-sm text-slate-300 mb-6 leading-relaxed">{{ s.tour.todoIntro.body }}</p>
            <button class="btn-primary w-full mb-3" (click)="goTodo()">{{ s.tour.todoIntro.cta }}</button>
            <button class="ob-skip mb-4" (click)="skip()">{{ s.skip }}</button>
            <div class="ob-steps" aria-hidden="true">
              <span class="ob-dot on"></span><span class="ob-dot"></span><span class="ob-dot"></span>
            </div>
          </div>
        </div>
      }

      <!-- Beat 3b: reminder — intro card on the dashboard. Skippable. -->
      @case ('reminder-intro') {
        <div class="ob-scrim ob-scrim-soft flex items-end sm:items-center justify-center p-4">
          <div class="glass-strong w-full max-w-sm rounded-3xl p-6 animate-pop" role="dialog" aria-modal="true">
            <div class="flex items-start gap-3 mb-4">
              <app-pip [size]="52" />
              <div class="min-w-0">
                <p class="pip-name">{{ s.name }} · Step 2 of 2</p>
                <h3 class="text-heading text-white leading-snug">{{ s.tour.reminderIntro.title }}</h3>
              </div>
            </div>
            <p class="text-body-sm text-slate-300 mb-6 leading-relaxed">{{ s.tour.reminderIntro.body }}</p>
            <button class="btn-primary w-full mb-3" (click)="goReminder()">{{ s.tour.reminderIntro.cta }}</button>
            <button class="ob-skip mb-4" (click)="skip()">{{ s.skip }}</button>
            <div class="ob-steps" aria-hidden="true">
              <span class="ob-dot on"></span><span class="ob-dot on"></span><span class="ob-dot"></span>
            </div>
          </div>
        </div>
      }

      <!-- On-page coach banners: slim, pinned to the top so the create form
           stays fully usable underneath. Skip pill lets them bail. -->
      @case ('todo-coach') {
        <div class="ob-coach animate-fade-up">
          <app-pip [size]="40" />
          <p class="text-body-sm text-white flex-1 min-w-0">{{ s.tour.todoOnPage }}</p>
          <button class="ob-coach-skip" (click)="skip()" aria-label="Skip the tour">Skip</button>
        </div>
      }
      @case ('reminder-coach') {
        <div class="ob-coach animate-fade-up">
          <app-pip [size]="40" />
          <p class="text-body-sm text-white flex-1 min-w-0">{{ s.tour.reminderOnPage }}</p>
          <button class="ob-coach-skip" (click)="skip()" aria-label="Skip the tour">Skip</button>
        </div>
      }

      <!-- Finale -->
      @case ('graduate') {
        <div class="ob-scrim flex items-center justify-center p-4">
          <div class="glass-strong w-full max-w-sm rounded-3xl p-6 animate-pop text-center" role="dialog" aria-modal="true" aria-labelledby="obGradTitle">
            <div class="flex justify-center mb-3"><app-pip [size]="72" mood="celebrate" /></div>
            <span class="chip mx-auto mb-3 border-gold/40 text-gold">🏅 {{ s.tour.graduate.badge }}</span>
            <h2 id="obGradTitle" class="text-heading-xl text-white mb-2">{{ gradTitle() }}</h2>
            <p class="text-body-sm text-slate-300 mb-6 leading-relaxed">{{ s.tour.graduate.body }}</p>
            <button class="btn-primary w-full mb-4" (click)="finish()">{{ s.tour.graduate.cta }}</button>
            <div class="ob-steps" aria-hidden="true">
              <span class="ob-dot on"></span><span class="ob-dot on"></span><span class="ob-dot on"></span>
            </div>
          </div>
        </div>
      }
    }
  `,
  styles: [`
    /* z-index 65 keeps Pip's dialogs above the reminder popup host (z-60) so a
       reminder that fires mid-tour can't swallow clicks on the finale's CTA. */
    .ob-scrim {
      position: fixed; inset: 0; z-index: 65;
      background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
    }
    /* Softer scrim for the intro cards so the app stays visible behind Pip. */
    .ob-scrim-soft { background: rgba(0,0,0,0.35); }
    .pip-name {
      font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em;
      color: #b8a5ff; font-weight: 700; margin-bottom: 2px;
    }
    .ob-coach {
      position: fixed; z-index: 65;
      top: calc(env(safe-area-inset-top) + 0.75rem);
      left: 50%; transform: translateX(-50%);
      width: min(92%, 30rem);
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.75rem 1rem; border-radius: 1rem;
      background: rgba(20,18,38,0.92); backdrop-filter: blur(10px);
      border: 1px solid rgba(124,92,255,0.4);
      box-shadow: 0 12px 40px -8px rgba(124,92,255,0.5);
    }
    /* Low-emphasis escape hatch on the intro cards — present but not competing
       with the primary CTA. */
    .ob-skip {
      display: block; margin-inline: auto;
      font-size: 0.8rem; color: rgba(226,232,240,0.55);
      background: none; border: none; cursor: pointer;
      transition: color 0.2s ease;
    }
    .ob-skip:hover { color: #fff; }
    /* Skip pill on the slim coach banner. */
    .ob-coach-skip {
      flex-shrink: 0; font-size: 0.72rem; font-weight: 600;
      color: rgba(226,232,240,0.65); background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12); border-radius: 9999px;
      padding: 0.25rem 0.6rem; cursor: pointer; transition: all 0.2s ease;
    }
    .ob-coach-skip:hover { color: #fff; background: rgba(255,255,255,0.12); }
    /* Progress stepper — the three real beats: to-do → reminder → graduate. */
    .ob-steps { display: flex; justify-content: center; gap: 0.4rem; }
    .ob-dot {
      height: 6px; width: 6px; border-radius: 9999px;
      background: rgba(255,255,255,0.18); transition: all 0.3s ease;
    }
    .ob-dot.on {
      background: linear-gradient(135deg,#7c5cff,#b64dff);
      box-shadow: 0 0 8px rgba(124,92,255,0.6); width: 18px;
    }
  `],
})
export class OnboardingHostComponent {
  private onb = inject(OnboardingService);
  private auth = inject(AuthService);
  private router = inject(Router);

  s = PIP;

  private url = signal(this.router.url);

  view = computed<View>(() => {
    const step = this.onb.step();
    const onPath = (p: string) => this.url().split(/[?#]/)[0].startsWith(p);
    // /guide is the DoctoGuide-branded outbound funnel (see app.routes.ts). It
    // carries no Zenamaze chrome by design, so Pip must never surface there —
    // a purple mascot introducing "Zenamaze" over a DoctoGuide page reads as a
    // broken page to paid traffic. Suppress the view only: the step itself is
    // untouched, so the guided run still picks up on the next Zenamaze screen.
    if (onPath('/guide')) return null;
    switch (step) {
      case 'welcome': return 'welcome';
      // Guided run armed, still on the landing page → nudge toward the goal box.
      // On /try the discovery screen narrates itself, so stay out of the way.
      case 'discovery': return this.url().split(/[?#]/)[0] === '/' ? 'discovery-hint' : null;
      case 'todo': return onPath('/tasks') ? 'todo-coach' : 'todo-intro';
      case 'reminder': return onPath('/reminders') ? 'reminder-coach' : 'reminder-intro';
      case 'graduate': return 'graduate';
      default: return null;
    }
  });

  gradTitle = computed(() => this.s.tour.graduate.title(this.auth.user()?.roastLevel));

  // Track the step so we can fire confetti exactly once on each celebration
  // (crossing into 'reminder' = to-do done; into 'graduate' = tour done).
  private lastStep: string = this.onb.step();

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.url.set(e.urlAfterRedirects));

    effect(() => {
      const step = this.onb.step();
      if (step !== this.lastStep) {
        // The plan reveal is the real "aha" — make it the biggest peak.
        if (step === 'plan') this.celebrate(0.5, true);
        if (step === 'reminder') this.celebrate(0.7);
        if (step === 'graduate') this.celebrate(0.4, true);
        this.lastStep = step;
      }
    });
  }

  chooseNew(): void {
    this.onb.startNewUser();
    // Give them an obvious next move: scroll to + focus the landing goal box.
    if (isBrowser) {
      setTimeout(() => {
        const el = document.getElementById('landingGoalInput') as HTMLInputElement | null;
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus();
      }, 60);
    }
  }
  chooseReturning(): void { this.onb.dismissWelcome(); this.router.navigate(['/login']); }

  goTodo(): void { this.router.navigate(['/tasks'], { queryParams: { new: 1 } }); }
  goReminder(): void { this.router.navigate(['/reminders'], { queryParams: { new: 1 } }); }

  finish(): void { this.onb.finish(); this.router.navigate(['/dashboard']); }

  // Let people out. Onboarding was mandatory; a forced tour is the fastest way to
  // make a new user resent the app. They keep their goal + plan (already saved);
  // only the guided to-do/reminder demo is skipped. Re-runnable later from Help.
  skip(): void { this.onb.skip(); this.router.navigate(['/dashboard']); }

  private celebrate(originY: number, big = false): void {
    if (!isBrowser) return;
    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({
        particleCount: big ? 160 : 90,
        spread: big ? 100 : 70,
        startVelocity: big ? 45 : 35,
        origin: { y: originY },
        colors: ['#7c5cff', '#b64dff', '#ff5cc8', '#ffd166'],
      });
    }).catch(() => { /* confetti is non-essential */ });
  }
}
