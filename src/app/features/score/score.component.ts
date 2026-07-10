import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import confetti from 'canvas-confetti';
import { ApiService } from '../../core/api.service';
import { Medal, ProductivityScore, ScoreComponents, ShareLinks } from '../../core/models';
import { ShareService } from '../../shared/share.service';
import { TopBarComponent } from '../../shared/top-bar.component';
import { BottomNavComponent } from '../../shared/bottom-nav.component';
import { ScoreDialComponent } from './score-dial.component';

interface ComponentRow {
  key: keyof ScoreComponents;
  label: string;
  weight: number;
}

@Component({
  selector: 'app-score',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, TopBarComponent, BottomNavComponent, ScoreDialComponent],
  template: `
    <app-top-bar></app-top-bar>

    <div class="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto w-full px-4 md:px-6 lg:px-8 pt-6 md:pt-8 pb-24 md:pb-12">
      <a routerLink="/dashboard" class="text-body-sm text-slate-400 hover:text-white mb-4 inline-block">← Today</a>
      <h1 class="text-display md:text-display-lg gradient-text mb-4 md:mb-6">Productivity Score</h1>

      <ng-container *ngIf="score() as s; else loadingTpl">
        <!-- Hero: dial + band + share -->
        <div class="glass p-5 md:p-6 mb-4 animate-fade-up md:flex md:items-center md:gap-8">
          <div class="flex flex-col items-center md:items-start">
            <app-score-dial [score]="s.score" [percent]="s.percent" [size]="248" [max]="900"></app-score-dial>
            <div class="text-center md:text-left mt-1">
              <span class="text-heading font-extrabold text-white">{{ s.band.emoji }} {{ s.band.label }}</span>
              <p class="text-caption text-slate-400 mt-0.5">{{ s.percent }}% overall · updates as you complete tasks</p>
            </div>
          </div>

          <div class="mt-5 md:mt-0 md:flex-1">
            <!-- Daily % -->
            <div class="card p-4 flex items-center justify-between">
              <div>
                <p class="text-white font-bold">Today's productivity</p>
                <p class="text-caption text-slate-400 mt-0.5">Effort-weighted — longer tasks count more.</p>
              </div>
              <div class="text-right">
                <p *ngIf="s.dailyPercent !== null" class="text-stat font-extrabold accent-text leading-none stat-number">{{ s.dailyPercent }}%</p>
                <p *ngIf="s.dailyPercent === null" class="text-body-sm text-slate-400">No tasks today</p>
              </div>
            </div>

            <button (click)="openShare()" [disabled]="preparing()"
              class="btn-primary w-full mt-4 flex items-center justify-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/>
              </svg>
              {{ preparing() ? 'Preparing…' : 'Share my score' }}
            </button>
          </div>
        </div>

        <!-- What builds your score -->
        <div class="glass p-4 md:p-5 mb-4 animate-fade-up">
          <p class="text-micro uppercase tracking-wider text-accent-soft mb-3">What builds your score</p>
          <div class="space-y-3">
            <div *ngFor="let row of rows">
              <div class="flex items-center justify-between mb-1">
                <span class="text-body-sm text-slate-200">{{ row.label }}</span>
                <span class="text-caption text-slate-400">{{ pct(s.components[row.key]) }}% · weight {{ row.weight }}%</span>
              </div>
              <div class="h-1.5 rounded-full bg-ink-800 overflow-hidden">
                <div class="h-full transition-all duration-700" style="background-image:linear-gradient(90deg,#ff7a45,#e8b64c,#7c5cff)"
                     [style.width.%]="pct(s.components[row.key])"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Medals shelf -->
        <div class="glass p-4 md:p-5 animate-fade-up">
          <div class="flex items-center justify-between mb-3">
            <p class="text-micro uppercase tracking-wider text-accent-soft">Medals</p>
            <span class="chip border-gold/40 text-gold">{{ earned().length }} / {{ earned().length + locked().length }}</span>
          </div>
          <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            <div *ngFor="let m of earned()" class="card p-3 text-center" [title]="m.description">
              <div class="text-3xl">{{ m.emoji }}</div>
              <p class="text-caption text-white font-semibold mt-1 leading-tight">{{ m.label }}</p>
              <p *ngIf="m.unlockedAt" class="text-[10px] text-slate-500 mt-0.5">{{ m.unlockedAt | date: 'MMM d' }}</p>
            </div>
            <div *ngFor="let m of locked()" class="card p-3 text-center opacity-40 grayscale" [title]="m.description + ' (locked)'">
              <div class="text-3xl">{{ m.emoji }}</div>
              <p class="text-caption text-slate-300 font-semibold mt-1 leading-tight">{{ m.label }}</p>
              <p class="text-[10px] text-slate-500 mt-0.5">Locked</p>
            </div>
          </div>
        </div>
      </ng-container>

      <ng-template #loadingTpl>
        <div class="py-20 flex justify-center"><div class="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin"></div></div>
      </ng-template>
    </div>

    <app-bottom-nav></app-bottom-nav>

    <!-- Share sheet -->
    <div *ngIf="shareOpen()" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center px-4 z-50"
         (click)="shareOpen.set(false)" (keydown.escape)="shareOpen.set(false)" tabindex="-1">
      <div class="glass-strong p-6 w-full max-w-sm mb-4 sm:mb-0 animate-fade-up" role="dialog" aria-modal="true"
           aria-labelledby="shareTitle" (click)="$event.stopPropagation()">
        <h3 id="shareTitle" class="text-heading text-white mb-1 text-center">Share your score</h3>
        <p class="text-body-sm text-slate-400 mb-4 text-center">Show off your progress — friends see your card and can start too.</p>

        <img *ngIf="links() as l" [src]="l.cardUrl" alt="Your productivity score card"
             class="w-full rounded-xl border border-white/10 mb-4" />

        <div class="grid grid-cols-3 gap-3">
          <button (click)="shareWhatsapp()" class="card p-3 flex flex-col items-center gap-1.5 hover:border-accent/40 transition">
            <span class="text-2xl">💬</span><span class="text-caption text-white">WhatsApp</span>
          </button>
          <button (click)="shareTwitter()" class="card p-3 flex flex-col items-center gap-1.5 hover:border-accent/40 transition">
            <span class="text-2xl">𝕏</span><span class="text-caption text-white">Post on X</span>
          </button>
          <button (click)="shareCopy()" class="card p-3 flex flex-col items-center gap-1.5 hover:border-accent/40 transition">
            <span class="text-2xl">🔗</span><span class="text-caption text-white">{{ copied() ? 'Copied!' : 'Copy link' }}</span>
          </button>
        </div>
        <button *ngIf="share.canNativeShare" (click)="shareNative()" class="btn-primary w-full mt-3">More options…</button>
        <button class="btn-ghost w-full mt-2 text-sm !py-2" (click)="shareOpen.set(false)">Close</button>
      </div>
    </div>
  `,
})
export class ScoreComponent implements OnInit {
  score = signal<ProductivityScore | null>(null);
  earned = signal<Medal[]>([]);
  locked = signal<Medal[]>([]);
  links = signal<ShareLinks | null>(null);
  preparing = signal(false);
  shareOpen = signal(false);
  copied = signal(false);

  // Ordered by weight (descending) — mirrors SCORE_WEIGHTS on the backend.
  rows: ComponentRow[] = [
    { key: 'accomplishment', label: 'Task accomplishment', weight: 35 },
    { key: 'momentum', label: 'Consistency', weight: 20 },
    { key: 'streak', label: 'Streak habit', weight: 15 },
    { key: 'pace', label: 'Recent pace', weight: 15 },
    { key: 'focus', label: 'Deep-work focus', weight: 10 },
    { key: 'volume', label: 'Experience', weight: 5 },
  ];

  constructor(private api: ApiService, public share: ShareService) {}

  ngOnInit(): void {
    this.api.productivityScore().subscribe({
      next: (s) => {
        this.score.set(s);
        if (s.newlyUnlockedMedals?.length) this.celebrate();
      },
    });
    this.api.medals().subscribe({
      next: (r) => {
        this.earned.set(r.earned);
        this.locked.set(r.locked);
      },
    });
  }

  pct(v: number): number {
    return Math.round(Math.max(0, Math.min(1, v)) * 100);
  }

  private celebrate() {
    try {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.4 } });
    } catch {
      /* confetti is best-effort */
    }
  }

  private shareText(): string {
    const s = this.score();
    if (!s) return 'My Productivity Score on Zenamaze';
    return `My Productivity Score is ${s.score}/900 — ${s.band.label} tier ${s.band.emoji} on Zenamaze. Building one goal at a time.`;
  }

  openShare() {
    if (this.links()) {
      this.shareOpen.set(true);
      return;
    }
    this.preparing.set(true);
    this.api.prepareShare().subscribe({
      next: (l) => {
        this.links.set(l);
        this.preparing.set(false);
        this.shareOpen.set(true);
      },
      error: () => this.preparing.set(false),
    });
  }

  private payload() {
    const l = this.links();
    return { url: l?.shareUrl || '', title: 'My Productivity Score', text: this.shareText() };
  }

  shareWhatsapp() {
    this.share.whatsapp(this.payload());
  }
  shareTwitter() {
    this.share.twitter(this.payload());
  }
  async shareNative() {
    await this.share.native(this.payload());
  }
  async shareCopy() {
    const ok = await this.share.copy(this.links()?.shareUrl || '');
    if (ok) {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
  }
}
