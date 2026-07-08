import { Injectable, computed, inject, signal } from '@angular/core';
import { isBrowser } from './platform';
import { AuthService } from './auth.service';
import { AnalyticsService } from './analytics.service';
import { AnalyticsEvent } from './analytics-events';

// The guided first-run journey, as one small state machine that survives page
// loads AND the guest→account boundary (it lives in localStorage, so signing up
// mid-flow doesn't lose the thread).
//
//   welcome   → first-open dialog on the landing page (new vs returning)
//   discovery → guest is talking to the AI Zenamaze (Pip narrates alongside)
//   plan      → guest plan is ready; sign-up gate is showing
//   todo      → account exists; spotlight-guide the first real to-do
//   reminder  → guide the first real reminder
//   graduate  → finale + confetti + badge
//   done/idle → not onboarding
//
// The feature screens don't drive the machine — they just *report* ("a to-do
// was created") and the service decides whether that advances the tour. That
// keeps the tour decoupled from each screen's modal internals.
export type OnbStep =
  | 'idle'
  | 'welcome'
  | 'discovery'
  | 'plan'
  | 'todo'
  | 'reminder'
  | 'graduate'
  | 'done';

interface OnbState {
  active: boolean; // is a guided run in progress?
  step: OnbStep;
  seenWelcome: boolean; // the first-open dialog only ever shows once
}

const KEY = 'zenamaze_onboarding';
const BLANK: OnbState = { active: false, step: 'idle', seenWelcome: false };

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private auth = inject(AuthService);
  private analytics = inject(AnalyticsService);

  private _state = signal<OnbState>(this.read());

  readonly step = computed(() => this._state().step);
  readonly active = computed(() => this._state().active);
  readonly seenWelcome = computed(() => this._state().seenWelcome);

  // --- Beat 0: first-open welcome -------------------------------------------
  // Landing calls this on init. Show the dialog once, for signed-out visitors
  // who haven't seen it and aren't already mid-run.
  maybeShowWelcome(): void {
    // Browser-only: on the server there's no localStorage token, so isAuthed()
    // is always false and we'd render the welcome dialog into the SSR HTML —
    // authed users would see it flash before client-side hydration redirects
    // them to the dashboard. Deciding on the client (where the token is
    // visible) avoids that flash entirely.
    if (!isBrowser) return;
    const s = this._state();
    if (s.seenWelcome || s.active || this.auth.isAuthed()) return;
    this.patch({ step: 'welcome' });
  }

  // Chose "I'm new": arm the run and let them use the landing goal input, which
  // already kicks off the guest discovery flow.
  startNewUser(): void {
    this.patch({ active: true, step: 'discovery', seenWelcome: true });
    this.analytics.logEvent(AnalyticsEvent.OnboardingStart);
  }

  // Chose "I have an account" / dismissed: never nag with the dialog again.
  dismissWelcome(): void {
    this.patch({ step: this._state().active ? this._state().step : 'idle', seenWelcome: true });
  }

  // --- Beat 1/2: guest flow markers (no-ops unless a run is active) ----------
  markPlanReady(): void {
    if (this.active()) this.patch({ step: 'plan' });
  }

  // The guest just saw their finished plan — the real "aha". Logged even outside
  // an active guided run so the funnel captures organic guests too.
  markPlanReveal(): void {
    this.analytics.logEvent(AnalyticsEvent.OnboardingStep, { step: 'plan_reveal' });
  }

  // --- Beat 3: post-sign-up tour --------------------------------------------
  // Dashboard calls this on init. If a run survived the sign-up, drop the user
  // into the first real-action step.
  beginTour(): void {
    if (!this.active()) return;
    const s = this._state().step;
    if (s === 'welcome' || s === 'discovery' || s === 'plan') this.patch({ step: 'todo' });
  }

  reportTodoCreated(): void {
    if (this.active() && this.step() === 'todo') this.patch({ step: 'reminder' });
  }

  reportReminderCreated(): void {
    if (this.active() && this.step() === 'reminder') this.patch({ step: 'graduate' });
  }

  finish(): void {
    if (this.active()) this.analytics.logEvent(AnalyticsEvent.OnboardingComplete);
    this.patch({ active: false, step: 'done' });
  }

  skip(): void {
    // Record WHERE they bailed so the funnel shows the leak, not just a count.
    this.analytics.logEvent(AnalyticsEvent.OnboardingSkip, { step: this.step() });
    this.patch({ active: false, step: 'done' });
  }

  // --- persistence ----------------------------------------------------------
  private patch(p: Partial<OnbState>): void {
    const prev = this._state().step;
    const next = { ...this._state(), ...p };
    this._state.set(next);
    // Per-beat funnel: one event each time the run advances to a new step.
    if (next.active && next.step !== prev && next.step !== 'idle' && next.step !== 'done') {
      this.analytics.logEvent(AnalyticsEvent.OnboardingStep, { step: next.step });
    }
    if (isBrowser) {
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore quota/private-mode failures */
      }
    }
  }

  private read(): OnbState {
    if (!isBrowser) return BLANK;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return BLANK;
      const parsed = JSON.parse(raw) as Partial<OnbState>;
      return { ...BLANK, ...parsed };
    } catch {
      return BLANK;
    }
  }
}
