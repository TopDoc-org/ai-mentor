import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ThemeService } from '../../core/theme.service';
import { OnboardingService } from '../../core/onboarding.service';
import { PIP } from '../../core/onboarding-script';
import { ChatMessage, GoalSummaryPreview } from '../../core/models';
import { categoryMeta } from '../../core/categories';
import { PipMascotComponent } from '../../shared/pip-mascot.component';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule, PipMascotComponent],
  template: `
    <div class="flex flex-col max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto w-full px-4 md:px-6 lg:px-8"
         style="height:100vh;height:100dvh">
      <!-- Header + progress -->
      <header class="pt-4 md:pt-6 pb-4 sticky top-0 bg-ink-950/80 backdrop-blur z-10">
        <div class="flex items-center gap-3 mb-3">
          <button (click)="back()" aria-label="Back"
                  class="h-9 w-9 -ml-1 shrink-0 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/5 transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <img src="icon.svg" alt="" class="h-7 w-7 rounded-lg shadow-glow object-cover">
            <span class="text-heading text-white">Discovery</span>
          </div>
          <span class="text-xs text-slate-400 shrink-0">{{ onb.active() ? pip.chapter(progress()) : progress() + '% clear' }}</span>
          <button (click)="theme.toggle()"
                  class="h-9 w-9 shrink-0 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-slate-200 hover:bg-white/20 transition-all"
                  [attr.aria-label]="theme.isLight() ? 'Switch to dark mode' : 'Switch to light mode'">
            @if (theme.isLight()) {
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            } @else {
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            }
          </button>
        </div>
        <div class="h-1.5 rounded-full bg-ink-800 overflow-hidden">
          <div class="h-full bg-accent transition-all duration-700 ease-out" [style.width.%]="progress()"></div>
        </div>
      </header>

      <!-- Pip's running commentary alongside the Zenamaze's interview -->
      <div *ngIf="onb.active()" class="flex items-center gap-2.5 pt-3 animate-fade-up">
        <app-pip [size]="34" [mood]="thinking() ? 'think' : 'happy'" [bob]="false" />
        <p class="text-caption text-accent-soft flex-1 min-w-0 leading-snug">{{ pip.discovery(progress()) }}</p>
      </div>

      <!-- Messages -->
      <div #scroll class="flex-1 overflow-y-auto py-4 space-y-5">
        <div *ngFor="let m of messages()"
             class="animate-fade-up flex items-end gap-2.5"
             [class.flex-row-reverse]="m.role === 'user'">
          <!-- Avatar -->
          <div *ngIf="m.role === 'user'" class="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold select-none bg-white/10 text-slate-200 border border-white/10">
            {{ userInitial() }}
          </div>
          <img *ngIf="m.role !== 'user'" src="icon.svg" alt="" class="h-8 w-8 shrink-0 rounded-full object-cover shadow-glow">
          <div class="max-w-[85%] sm:max-w-[78%] md:max-w-[70%] lg:max-w-[65%] px-4 py-3 rounded-2xl leading-relaxed"
               [ngClass]="m.role === 'user'
                 ? 'bg-accent text-white rounded-br-md'
                 : 'glass rounded-bl-md text-slate-100 text-body'">
            {{ m.text }}
          </div>
        </div>

        <div *ngIf="thinking()" class="flex items-end gap-2.5 animate-fade-up">
          <img src="icon.svg" alt="" class="h-8 w-8 shrink-0 rounded-full object-cover shadow-glow">
          <div class="glass rounded-bl-md px-4 py-3 flex gap-1.5 items-center">
            <span class="h-2 w-2 rounded-full bg-accent-soft animate-bounce" style="animation-delay:0ms"></span>
            <span class="h-2 w-2 rounded-full bg-accent-soft animate-bounce" style="animation-delay:150ms"></span>
            <span class="h-2 w-2 rounded-full bg-accent-soft animate-bounce" style="animation-delay:300ms"></span>
          </div>
        </div>

        <!-- Confirmation card: what Zenamaze understood + how it'll break the goal
             down. Shown BEFORE any plan/tasks are created. Confirm to build;
             type below to refine. -->
        <div *ngIf="summary() as s" class="animate-fade-up glass-strong p-5 md:p-6 space-y-4">
          <div class="flex items-center justify-between gap-3">
            <span class="text-micro uppercase tracking-wider text-slate-400">Here's what I understood</span>
            <span class="chip shrink-0" [ngClass]="catMeta(s.category).chip">
              {{ catMeta(s.category).emoji }} {{ catMeta(s.category).label }}
            </span>
          </div>

          <p class="text-body text-slate-100 leading-relaxed">{{ s.understanding }}</p>

          <div *ngIf="s.dailyCommitment || s.deadlineDate" class="flex flex-wrap gap-2">
            <span *ngIf="s.dailyCommitment" class="chip">⏱️ {{ s.dailyCommitment }}</span>
            <span *ngIf="s.deadlineDate" class="chip">🎯 by {{ s.deadlineDate | date: 'mediumDate' }}</span>
          </div>

          <div *ngIf="s.breakdown.length" class="pt-1">
            <p class="text-micro uppercase tracking-wider text-slate-500 mb-2.5">How I'll break it down</p>
            <ol class="space-y-2.5">
              <li *ngFor="let step of s.breakdown; let i = index" class="flex gap-3 items-start">
                <span class="h-6 w-6 shrink-0 rounded-full bg-accent/15 text-accent-soft text-xs font-bold flex items-center justify-center mt-0.5">{{ i + 1 }}</span>
                <span class="text-body-sm text-slate-200 leading-relaxed">{{ step }}</span>
              </li>
            </ol>
          </div>

          <div class="pt-2 space-y-2.5">
            <button class="btn-primary w-full" (click)="confirm()" [disabled]="confirming() || building()">
              {{ confirming() ? 'Building…' : 'Looks right — build my plan →' }}
            </button>
            <p class="text-caption text-slate-500 text-center">Not quite? Tell me what's off below and I'll dig deeper.</p>
          </div>
        </div>

        <div *ngIf="building()" class="text-center py-8 animate-fade-up">
          <div class="inline-block h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin mb-3"></div>
          <p class="text-slate-300 font-semibold">Building your plan…</p>
          <p class="text-slate-400 text-sm">Breaking your goal into one thing a day.</p>
        </div>

        <!-- Scroll anchor: always kept in view after each new message -->
        <div #anchor></div>
      </div>

      <!-- Composer -->
      <div class="pt-3 pb-4 md:pb-5 bg-ink-950">
        <form (ngSubmit)="send()"
              class="glass flex gap-2 items-end !rounded-3xl px-2 py-2 focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/20 transition">
          <textarea
            [(ngModel)]="draft" name="draft" rows="1"
            (keydown.enter)="onEnter($event)"
            [disabled]="building()"
            class="flex-1 resize-none max-h-32 bg-transparent px-3 py-2.5 text-white placeholder:text-slate-400 outline-none leading-relaxed"
            [placeholder]="summary() ? 'Add anything I missed…' : 'Type your answer…'"></textarea>
          <button
            class="h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center text-white shadow-glow transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 disabled:shadow-none"
            style="background-image:linear-gradient(135deg,#7c5cff,#b64dff)"
            type="submit" [disabled]="!draft.trim() || thinking() || building()" aria-label="Send">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 12l16-8-6 16-2-6-8-2z" fill="currentColor"/></svg>
          </button>
        </form>
        <p class="text-caption text-slate-500 text-center mt-2.5">
          {{ summary() ? "Or tap build above when it looks right." : "Zenamaze is drawing out what really matters. Be honest." }}
        </p>
      </div>
    </div>
  `,
})
export class OnboardingComponent implements OnInit {
  @ViewChild('scroll') scrollEl?: ElementRef<HTMLDivElement>;
  @ViewChild('anchor') anchorEl?: ElementRef<HTMLDivElement>;

  theme = inject(ThemeService);
  onb = inject(OnboardingService);
  pip = PIP;
  goalId = '';
  guest = false;
  messages = signal<ChatMessage[]>([]);
  draft = '';
  thinking = signal(false);
  building = signal(false);
  confirming = signal(false);
  summary = signal<GoalSummaryPreview | null>(null);
  progress = signal(10);

  catMeta = categoryMeta;

  userInitial = computed(() => {
    const n = this.auth.user()?.name?.trim();
    return n ? n[0].toUpperCase() : 'Y';
  });

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    effect(() => {
      this.messages();
      this.thinking();
      this.summary();
      setTimeout(() => this.scrollToBottom());
    });
  }

  ngOnInit(): void {
    this.goalId = this.route.snapshot.paramMap.get('id') || '';
    this.guest = !!this.route.snapshot.data['guest'];
    const load = this.guest ? this.api.guestGetGoal(this.goalId) : this.api.getGoal(this.goalId);
    load.subscribe({
      next: (g) => {
        if (g.phase === 'done') {
          this.gotoPlan();
          return;
        }
        this.messages.set(g.messages || []);
        // Reload landed on the confirmation phase → restore the card.
        if (g.phase === 'summary' && g.summary) {
          this.summary.set(g.summary);
          this.progress.set(100);
          return;
        }
        this.progress.set(Math.min((g.discoveryState?.askedCount || 1) * 12, 92));
      },
      error: () => this.router.navigate([this.guest ? '/' : '/dashboard']),
    });
  }

  private gotoPlan() {
    this.router.navigate(this.guest ? ['/try', this.goalId, 'plan'] : ['/plan', this.goalId]);
  }

  back() {
    this.router.navigate([this.guest ? '/' : '/dashboard']);
  }

  onEnter(e: Event) {
    const ke = e as KeyboardEvent;
    if (!ke.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }

  send() {
    const text = this.draft.trim();
    if (!text || this.thinking() || this.building() || this.confirming()) return;
    // Sending while the summary is up = "not quite, ask me more" — drop the card
    // and reopen the interview (the backend adds a couple of bonus questions).
    this.summary.set(null);
    this.messages.update((m) => [...m, { role: 'user', text }]);
    this.draft = '';
    setTimeout(() => this.scrollToBottom());
    this.thinking.set(true);

    const req = this.guest
      ? this.api.guestMessage(this.goalId, text)
      : this.api.sendMessage(this.goalId, text);
    req.subscribe({
      next: (r) => {
        this.thinking.set(false);
        if (r.type === 'plan') {
          this.building.set(true);
          setTimeout(() => this.gotoPlan(), 1200);
          return;
        }
        // Interview ready → show the confirmation card instead of a plan.
        if (r.type === 'summary' && r.summary) {
          this.progress.set(100);
          this.summary.set(r.summary);
          setTimeout(() => this.scrollToBottom());
          return;
        }
        if (typeof r.progress === 'number') this.progress.set(r.progress);
        this.messages.update((m) => [...m, { role: 'assistant', text: r.message || '' }]);
        setTimeout(() => this.scrollToBottom());
      },
      error: () => {
        this.thinking.set(false);
        this.messages.update((m) => [
          ...m,
          { role: 'assistant', text: 'Hmm, I lost that. Say it once more?' },
        ]);
        setTimeout(() => this.scrollToBottom());
      },
    });
  }

  // User accepted the summary → build + persist the real plan, then move on.
  confirm() {
    if (this.confirming() || this.building()) return;
    this.confirming.set(true);
    const req = this.guest ? this.api.guestConfirm(this.goalId) : this.api.confirmGoal(this.goalId);
    req.subscribe({
      next: () => {
        this.confirming.set(false);
        this.summary.set(null);
        this.building.set(true);
        setTimeout(() => this.gotoPlan(), 1200);
      },
      error: () => {
        this.confirming.set(false);
        this.messages.update((m) => [
          ...m,
          { role: 'assistant', text: 'Could not build that just yet — give it another tap in a moment?' },
        ]);
      },
    });
  }

  private scrollToBottom() {
    // Prefer the anchor (reliable across layouts); fall back to the container.
    const anchor = this.anchorEl?.nativeElement;
    if (anchor) {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'end' });
      return;
    }
    const el = this.scrollEl?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
