import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Dashboard } from '../../core/models';
import { BottomNavComponent } from '../../shared/bottom-nav.component';
import { TopBarComponent } from '../../shared/top-bar.component';
import { AnalysisComponent } from '../analysis/analysis.component';
import { rewardBadge, focusCaption } from '../../shared/rewards';

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, BottomNavComponent, TopBarComponent, AnalysisComponent],
  template: `
    <app-top-bar></app-top-bar>

    <div class="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto w-full px-4 md:px-6 lg:px-8 pt-6 md:pt-8 lg:pt-10 pb-10">
      <a routerLink="/dashboard" class="text-body-sm text-slate-400 hover:text-white mb-4 md:mb-6 inline-block">← Today</a>
      <h1 class="text-display md:text-display-lg gradient-text mb-4 md:mb-6">Your progress</h1>

      <ng-container *ngIf="data() as d; else loadingTpl">
        <!-- Deadline + Stats: side by side on md+ -->
        <div class="md:flex md:gap-4 md:items-stretch mb-4 animate-fade-up">
          <div *ngIf="d.deadlineDate" class="glass px-4 py-3 flex items-center justify-between md:flex-1">
            <div class="flex items-center gap-2.5">
              <span class="text-xl">🏁</span>
              <div>
                <p class="text-body-sm text-white font-semibold">Target · {{ d.deadlineDate | date: 'MMM d, yyyy' }}</p>
                <p class="text-caption text-slate-400">The day you've committed to.</p>
              </div>
            </div>
            <div class="text-right shrink-0">
              <p class="text-stat font-extrabold accent-text leading-none stat-number">{{ d.daysLeft }}</p>
              <p class="text-micro text-slate-400">days left</p>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3 md:gap-4 md:flex-1 mt-4 md:mt-0">
            <div class="card p-3 md:p-4 text-center">
              <div class="text-stat font-extrabold text-flame flex items-center justify-center gap-1 stat-number">{{ d.streak }} <span class="text-base md:text-lg">🔥</span></div>
              <p class="text-caption text-slate-400 mt-1">day streak</p>
            </div>
            <div class="card p-3 md:p-4 text-center">
              <div class="text-stat font-extrabold stat-number" [class.text-gold]="d.momentum >= 60" [class.text-slate-300]="d.momentum < 60">{{ d.momentum }}</div>
              <p class="text-caption text-slate-400 mt-1">momentum</p>
            </div>
            <div class="card p-3 md:p-4 text-center">
              <div class="text-stat font-extrabold text-white stat-number">{{ d.today.done }}/{{ d.today.total }}</div>
              <p class="text-caption text-slate-400 mt-1">today</p>
            </div>
          </div>
        </div>

        <!-- Momentum bar -->
        <div class="h-2 rounded-full bg-ink-800 overflow-hidden mb-4 animate-fade-up"
             role="progressbar" [attr.aria-valuenow]="d.momentum" aria-valuemin="0" aria-valuemax="100" aria-label="Momentum">
          <div class="h-full transition-all duration-700" [class.bg-gold]="d.momentum >= 60" [class.bg-flame]="d.momentum < 60" [style.width.%]="d.momentum"></div>
        </div>

        <!-- Rewards + weekly focus: 2-col on md+ -->
        <div class="glass p-4 md:p-5 mb-4 animate-fade-up">
          <div class="lg:grid lg:grid-cols-2 lg:gap-6">
            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2.5">
                  <span class="h-9 w-9 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-glow"
                        style="background-image:linear-gradient(135deg,#e8b64c,#ff7a45)">L{{ d.level }}</span>
                  <div>
                    <p class="text-white font-bold leading-none">{{ d.points }} <span class="text-slate-400 font-medium text-body-sm">pts</span></p>
                    <p class="text-caption text-slate-400 mt-1">{{ d.pointsToNext }} pts to level {{ d.level + 1 }}</p>
                  </div>
                </div>
                <span *ngIf="rewardBadge(d) as badge" class="chip border-gold/40 text-gold shrink-0">{{ badge }}</span>
              </div>
              <div class="h-1.5 rounded-full bg-ink-800 overflow-hidden mb-4 lg:mb-0"
                   role="progressbar" [attr.aria-valuenow]="100 - d.pointsToNext" aria-valuemin="0" aria-valuemax="100"
                   [attr.aria-label]="'Progress to level ' + (d.level + 1)">
                <div class="h-full transition-all duration-700" style="background-image:linear-gradient(90deg,#e8b64c,#ff7a45)" [style.width.%]="100 - d.pointsToNext"></div>
              </div>
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <div *ngFor="let day of d.week" class="flex-1">
                  <div class="h-8 md:h-10 rounded-lg transition-all"
                       [attr.title]="(day.date | date: 'EEE, MMM d') + ' — ' + heatLabel(day.status)"
                       [ngClass]="{
                         'bg-gold': day.status === 'done',
                         'bg-accent/40': day.status === 'partial',
                         'bg-flame/50': day.status === 'missed',
                         'bg-white/5 ring-1 ring-accent animate-pulse-glow': day.status === 'today',
                         'bg-white/5': day.status === 'none'
                       }"></div>
                  <p class="text-[10px] text-slate-400 text-center mt-1">{{ day.date | date: 'EEEEE' }}</p>
                </div>
              </div>
              <!-- Legend -->
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5">
                <span class="inline-flex items-center gap-1.5 text-micro text-slate-400"><span class="h-2.5 w-2.5 rounded bg-gold"></span>Done</span>
                <span class="inline-flex items-center gap-1.5 text-micro text-slate-400"><span class="h-2.5 w-2.5 rounded bg-accent/40"></span>Partial</span>
                <span class="inline-flex items-center gap-1.5 text-micro text-slate-400"><span class="h-2.5 w-2.5 rounded bg-flame/50"></span>Missed</span>
              </div>
              <p class="text-xs mt-2" [ngClass]="d.focusDays >= 4 ? 'text-slate-400' : 'text-flame'">{{ focusCaption(d) }}</p>
            </div>
          </div>
        </div>

        <!-- Behind banner -->
        <div *ngIf="d.behindPace >= 25" class="glass p-3 md:p-4 mb-4 border-flame/40 animate-fade-up flex items-center gap-3">
          <span class="text-flame text-xl md:text-2xl">⚠</span>
          <div>
            <p class="text-flame font-semibold text-sm md:text-body">You're {{ d.behindPace }}% behind pace.</p>
            <p class="text-body-sm text-slate-400">Close a task today to stop the slide.</p>
          </div>
        </div>

        <!-- Checkpoint + revise -->
        <div *ngIf="d.currentCheckpoint as cp" class="glass p-4 md:p-5 animate-fade-up">
          <div class="flex items-center justify-between">
            <p class="text-micro uppercase tracking-wider text-accent-soft">Next checkpoint · {{ cp.date | date: 'MMM d' }}</p>
            <button class="text-caption text-slate-400 hover:text-white shrink-0 ml-2" (click)="reviseOpen.set(!reviseOpen())">I'm behind — adjust</button>
          </div>
          <p class="text-body-sm text-slate-100 mt-2">{{ cp.target }}</p>
          <div *ngIf="reviseOpen()" class="mt-4 animate-fade-up">
            <textarea class="input resize-none" rows="3" [(ngModel)]="reviseText"
              placeholder="Tell Zenamaze what changed — e.g. 'I studied a lot but forgot some DP topics.'"></textarea>
            <div class="flex gap-2 justify-end mt-2">
              <button class="btn-ghost text-sm !py-2" (click)="reviseOpen.set(false)">Cancel</button>
              <button class="btn-primary text-sm !py-2" (click)="submitRevise(d.primaryGoalId)" [disabled]="!reviseText.trim() || revising()">
                {{ revising() ? 'Rebuilding…' : 'Adjust my plan' }}
              </button>
            </div>
          </div>
        </div>
      </ng-container>

      <ng-template #loadingTpl>
        <div class="py-20 flex justify-center"><div class="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin"></div></div>
      </ng-template>

      <!-- Analysis & roast — calendar, trends, and the Zenamaze's brutal honesty, inline. -->
      <div class="mt-8 md:mt-10 pt-6 border-t border-white/5">
        <h2 class="text-heading-lg text-white mb-4">Analysis &amp; roast</h2>
        <app-analysis></app-analysis>
      </div>
    </div>

    <app-bottom-nav></app-bottom-nav>
  `,
})
export class ProgressComponent implements OnInit {
  data = signal<Dashboard | null>(null);
  reviseOpen = signal(false);
  reviseText = '';
  revising = signal(false);

  rewardBadge = rewardBadge;
  focusCaption = focusCaption;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.api.dashboard().subscribe({ next: (d) => this.data.set(d) });
  }

  heatLabel(status: string): string {
    switch (status) {
      case 'done': return 'all tasks done';
      case 'partial': return 'some tasks done';
      case 'missed': return 'missed';
      case 'today': return 'today';
      default: return 'no tasks';
    }
  }

  submitRevise(goalId: string | null) {
    const feedback = this.reviseText.trim();
    if (!goalId || !feedback || this.revising()) return;
    this.revising.set(true);
    this.api.reviseGoal(goalId, feedback).subscribe({
      next: () => {
        this.revising.set(false);
        this.reviseOpen.set(false);
        this.reviseText = '';
        this.load();
      },
      error: () => this.revising.set(false),
    });
  }
}
