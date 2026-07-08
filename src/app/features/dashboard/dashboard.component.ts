import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import confetti from 'canvas-confetti';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { OnboardingService } from '../../core/onboarding.service';
import { ReminderBus } from '../../core/reminder-bus.service';
import { AnalysisMeme, Dashboard, GoalSummary, MyProjectTask, MyProjectTodo, Note, PendingCheckpointReport, ProjectNotice, ProjectReminder, Reminder, Task, Todo } from '../../core/models';
import { memegenUrl } from '../../shared/meme';
import { RoastLevelSwitcherComponent } from '../../shared/roast-level-switcher.component';
import { BottomNavComponent } from '../../shared/bottom-nav.component';
import { TopBarComponent } from '../../shared/top-bar.component';
import { FocusTimerComponent } from '../../shared/focus-timer.component';
import { CounterDirective } from '../../shared/counter.directive';
import { ReportModalComponent } from '../../shared/report-modal.component';
import { rewardBadge, focusCaption } from '../../shared/rewards';

// One unified row for the single "Today" list — a goal focus task, a to-do, a
// reminder, or a TEAM item (project task/to-do/checkpoint-report-due), all
// normalized so they can be merged and sorted by priority together.
type TodayKind = 'task' | 'todo' | 'reminder' | 'project-task' | 'project-todo' | 'project-reminder' | 'checkpoint-report';
interface TodayItem {
  kind: TodayKind;
  id: string;
  title: string;
  icon: string;
  kindLabel: string;
  meta: string;
  goalTitle: string; // '' when the item isn't tied to a goal
  done: boolean;
  urgent: boolean; // overdue / missed → surfaces at the top, red border
  high: boolean; // high priority
  sort: number; // lower = higher up the list
  ref: Task | Todo | Reminder | MyProjectTask | MyProjectTodo | ProjectReminder | PendingCheckpointReport;
  projectName?: string; // present on team-sourced rows — rendered as a chip
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, BottomNavComponent, TopBarComponent, FocusTimerComponent, CounterDirective, RoastLevelSwitcherComponent, ReportModalComponent],
  template: `
    <app-top-bar></app-top-bar>

    <div class="max-w-md sm:max-w-xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto w-full px-4 md:px-6 lg:px-8 pt-6 md:pt-8 lg:pt-10 pb-28 md:pb-10">
      <!-- Compact time-of-day line -->
      <p class="text-caption text-slate-400 mb-3 animate-fade-up">{{ greetingTime() }}, {{ firstName() }}</p>

      <!-- Zenamaze roast (from your analysis) — top-of-screen motivator; level switch inline. -->
      <div *ngIf="roast() as r; else roastSkel"
           class="glass-strong relative p-4 md:p-5 mb-5 md:mb-6 flex items-start gap-3 w-full animate-fade-up"
           [class.z-40]="rls.open()"
           [ngClass]="{ 'border-gold/40': roastTone() === 'good', 'border-accent/40': roastTone() === 'mid', 'border-flame/40': roastTone() === 'bad' }">
        <img src="icon.svg" alt="" class="h-9 w-9 md:h-10 md:w-10 shrink-0 rounded-full object-cover shadow-glow">
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-2 mb-1">
            <p class="text-micro uppercase tracking-wider"
               [ngClass]="{ 'text-gold': roastTone() === 'good', 'text-accent-soft': roastTone() === 'mid', 'text-flame': roastTone() === 'bad' }">Zenamaze</p>
            <app-roast-level-switcher #rls (changed)="loadRoast()"></app-roast-level-switcher>
          </div>
          <p class="text-body md:text-heading text-white font-bold leading-snug">{{ r }}</p>
          <a routerLink="/progress" class="inline-block text-caption text-slate-400 hover:text-white mt-2">See full analysis →</a>
        </div>
      </div>
      <ng-template #roastSkel>
        <div class="glass-strong p-4 md:p-5 mb-5 md:mb-6 flex items-start gap-3 w-full animate-fade-up">
          <div class="skeleton-block h-9 w-9 md:h-10 md:w-10 rounded-full shrink-0"></div>
          <div class="flex-1">
            <div class="skeleton-block h-3 w-24 mb-2"></div>
            <div class="skeleton-block h-4 w-full mb-1.5"></div>
            <div class="skeleton-block h-4 w-2/3"></div>
          </div>
        </div>
      </ng-template>

      <!-- Momentum peek (mobile only) — up top so it motivates first thing -->
      <a *ngIf="data() as d" routerLink="/progress"
         class="md:hidden glass p-3 md:p-4 flex items-center justify-between animate-fade-up hover:border-accent/40 transition mb-5" style="animation-delay:120ms">
        <div class="flex items-center gap-3">
          <span class="h-9 w-9 md:h-10 md:w-10 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-glow"
                style="background-image:linear-gradient(135deg,#e8b64c,#ff7a45)">{{ d.level }}</span>
          <div>
            <p class="text-body-sm text-white font-semibold"><span class="stat-number"><span [counter]="d.streak" [counterDuration]="600"></span></span>🔥 · <span class="stat-number"><span [counter]="d.points" [counterDuration]="600"></span></span> pts · momentum <span [counter]="d.momentum" [counterDuration]="600"></span></p>
            <p class="text-caption text-slate-400 mt-0.5">Streak, rewards & checkpoints →</p>
          </div>
        </div>
        <span class="text-slate-400">→</span>
      </a>

      <!-- Productivity Score card — links to the full score/medals page -->
      <a *ngIf="data() as d" routerLink="/score"
         class="glass p-4 md:p-5 flex items-center justify-between animate-fade-up hover:border-accent/40 transition mb-5" style="animation-delay:140ms">
        <div class="flex items-center gap-4">
          <div class="text-center shrink-0">
            <div class="text-stat font-extrabold gradient-text leading-none stat-number"><span [counter]="d.score" [counterDuration]="900"></span></div>
            <p class="text-micro text-slate-400 mt-0.5">of 900</p>
          </div>
          <div>
            <p class="text-body-sm text-white font-semibold">{{ d.scoreBand.emoji }} {{ d.scoreBand.label }} · Productivity Score</p>
            <p class="text-caption text-slate-400 mt-0.5">
              <span *ngIf="d.dailyPercent !== null">Today {{ d.dailyPercent }}% done · </span>tap for medals &amp; sharing →
            </p>
          </div>
        </div>
        <span class="text-slate-400">→</span>
      </a>

      <ng-container *ngIf="data() as d">
        <!-- Quick stats (desktop only) -->
        <div class="hidden md:grid grid-cols-4 gap-3 mb-6 animate-fade-up">
          <div class="glass p-3 text-center">
            <div class="text-heading-xl font-extrabold text-flame stat-number"><span [counter]="d.streak" [counterDuration]="600"></span></div>
            <p class="text-caption text-slate-400 mt-0.5">🔥 day streak</p>
          </div>
          <div class="glass p-3 text-center">
            <div class="text-heading-xl font-extrabold stat-number" [class.text-gold]="d.momentum >= 60" [class.text-slate-200]="d.momentum < 60"><span [counter]="d.momentum" [counterDuration]="600"></span></div>
            <p class="text-caption text-slate-400 mt-0.5">📈 momentum</p>
          </div>
          <div class="glass p-3 text-center">
            <div class="text-heading-xl font-extrabold text-white">L<span [counter]="d.level" [counterDuration]="400"></span></div>
            <p class="text-caption text-slate-400 mt-0.5">🏆 <span [counter]="d.points" [counterDuration]="600"></span> pts</p>
          </div>
          <a *ngIf="d.deadlineDate" [routerLink]="d.primaryGoalId ? ['/goal', d.primaryGoalId] : null" class="glass p-3 text-center block hover:border-accent/40 transition">
            <div class="text-heading-xl font-extrabold accent-text stat-number"><span [counter]="d.daysLeft" [counterDuration]="600"></span></div>
            <p class="text-caption text-slate-400 mt-0.5 truncate" [attr.title]="primaryGoalTitle()">🏁 days left{{ primaryGoalTitle() ? ' · ' + primaryGoalTitle() : '' }}</p>
          </a>
          <div *ngIf="!d.deadlineDate" class="glass p-3 text-center flex items-center justify-center">
            <p class="text-body-sm text-slate-400">No deadline set</p>
          </div>
        </div>
      </ng-container>

      <!-- Main grid: 2-column on md+ (tablet & laptop) — each section reveals as ITS data arrives -->
      <div class="md:grid md:grid-cols-2 md:gap-6 xl:gap-8">

        <!-- Left column: Today's focus + behind nudge -->
        <div>
          <!-- Behind-pace nudge -->
          <ng-container *ngIf="data() as d">
            <div *ngIf="d.behindPace >= 25"
                 class="md:hidden glass p-3 md:p-4 mb-4 border-flame/40 animate-fade-up flex items-center gap-3">
              <span class="text-flame text-xl md:text-2xl">⚠</span>
              <div>
                <p class="text-flame font-semibold text-sm md:text-body">You're <span [counter]="d.behindPace" [counterDuration]="400"></span>% behind pace.</p>
                <p class="text-body-sm text-slate-400">Every skipped day compounds. Close one task now to stop the slide.</p>
              </div>
            </div>
          </ng-container>

            <section class="mb-8 lg:mb-0 animate-fade-up">
              <div class="flex items-center justify-between mb-1">
                <h2 class="text-heading text-white">Today</h2>
                <span class="text-caption text-slate-400 stat-number">{{ todayDone() }}/{{ todayTotal() }} done</span>
              </div>
              <p class="text-caption text-slate-400 mb-3">Everything due today — focus, to-dos & reminders — in priority order. Just work top to bottom.</p>

              <!-- Loading: wait for all three sources so the merged order is stable -->
              <div *ngIf="!allLoaded()" class="space-y-3">
                <div class="card p-3 md:p-4 skeleton-shimmer h-16"></div>
                <div class="card p-3 md:p-4 skeleton-shimmer h-16"></div>
                <div class="card p-3 md:p-4 skeleton-shimmer h-16"></div>
              </div>

              <!-- Empty -->
              <div *ngIf="allLoaded() && todayTotal() === 0" class="card p-6 md:p-8 text-center">
                <p class="text-slate-400">Nothing on today's list.</p>
                <p class="text-body-sm text-slate-400 mt-1">Set a goal and Zenamaze breaks it into a daily action — or add a quick <a routerLink="/tasks" class="accent-text underline">to-do</a> or <a routerLink="/reminders" class="accent-text underline">reminder</a>.</p>
                <a routerLink="/new" class="btn-primary mt-4 inline-flex">Set your first goal</a>
              </div>

              <!-- Unified, priority-ordered list -->
              <div *ngIf="allLoaded() && todayTotal()" class="space-y-3">
                <div *ngFor="let it of todayItems(); trackBy: trackByItem"
                     class="card p-3 md:p-4 flex flex-wrap items-center gap-x-3 gap-y-2 md:gap-4 transition-all"
                     [class.opacity-60]="it.done"
                     [class.border-flame]="it.urgent">
                  <button *ngIf="it.kind !== 'checkpoint-report'" (click)="toggleItem(it)" [disabled]="it.done"
                          [attr.aria-label]="(it.done ? 'Completed: ' : 'Mark done: ') + it.title"
                          class="h-7 w-7 md:h-8 md:w-8 shrink-0 rounded-full border-2 flex items-center justify-center transition-all"
                          [ngClass]="it.done ? 'bg-accent border-accent text-white animate-pop' : 'border-white/20 hover:border-accent'">
                    <svg *ngIf="it.done" class="h-3.5 w-3.5 md:h-4 md:w-4" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                  <button *ngIf="it.kind === 'checkpoint-report'" (click)="toggleItem(it)"
                          class="h-7 w-7 md:h-8 md:w-8 shrink-0 rounded-full border-2 border-flame/60 text-flame flex items-center justify-center transition-all">📋</button>
                  <div class="flex-1 min-w-0 basis-0">
                    <div class="flex flex-wrap items-center gap-1.5">
                      <span class="chip shrink-0 !py-0.5 !px-2 text-micro"
                            [ngClass]="{
                              'text-accent-soft border-accent/30': it.kind === 'task',
                              'text-gold border-gold/30': it.kind === 'todo',
                              'text-sky-300 border-sky-400/30': it.kind === 'reminder' || it.kind === 'project-reminder',
                              'text-emerald-300 border-emerald-400/30': it.kind === 'project-task',
                              'text-amber-300 border-amber-400/30': it.kind === 'project-todo',
                              'text-flame border-flame/40': it.kind === 'checkpoint-report'
                            }">{{ it.icon }} {{ it.kindLabel }}</span>
                      <span *ngIf="it.goalTitle" class="chip !py-0.5 !px-2 text-micro text-gold border-gold/30 max-w-[180px] truncate" [attr.title]="it.goalTitle">🎯 {{ it.goalTitle }}</span>
                      <span *ngIf="it.projectName" class="chip !py-0.5 !px-2 text-micro text-emerald-300 border-emerald-400/30 max-w-[160px] truncate" [attr.title]="it.projectName">👥 {{ it.projectName }}</span>
                      <span *ngIf="it.urgent" class="chip !py-0.5 !px-2 text-micro text-flame border-flame/40">overdue</span>
                      <span *ngIf="it.high && !it.urgent" class="chip !py-0.5 !px-2 text-micro text-flame border-flame/40">high</span>
                    </div>
                    <p class="text-body-sm md:text-body text-white font-medium break-words mt-1" [class.line-through]="it.done">{{ it.title }}</p>
                    <p *ngIf="it.meta" class="text-caption text-slate-400 mt-0.5">{{ it.meta }}</p>
                    <div *ngIf="it.kind === 'task' && !it.done && (asTask(it.ref).spentMs ?? 0) > 0" class="flex items-center gap-2 mt-1.5">
                      <div class="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                        <div class="h-full bg-accent transition-all" [style.width.%]="focusPct(asTask(it.ref))"></div>
                      </div>
                      <span class="text-caption text-accent-soft shrink-0">⏱ {{ spentMin(asTask(it.ref)) }} min</span>
                    </div>
                  </div>
                  <!-- Focus/Postpone only apply to goal tasks -->
                  <div *ngIf="it.kind === 'task' && !it.done && asTask(it.ref).status === 'pending'"
                       class="basis-full sm:basis-auto flex items-center gap-2 shrink-0 pl-10 sm:pl-0">
                    <button (click)="activeTimer.set(asTask(it.ref))"
                            class="btn-ghost text-caption !py-1 !px-2.5 shrink-0 whitespace-nowrap">🎯 Focus</button>
                    <button (click)="postpone(asTask(it.ref))"
                            class="text-caption text-slate-400 hover:text-accent-soft shrink-0 whitespace-nowrap">Postpone</button>
                    <a *ngIf="asTask(it.ref).type === 'recurring' && asTask(it.ref).goalId" [routerLink]="['/goal', asTask(it.ref).goalId]"
                       title="Edit weekday schedule"
                       class="text-caption text-slate-400 hover:text-accent-soft shrink-0 whitespace-nowrap">Schedule</a>
                  </div>
                  <a *ngIf="it.kind === 'todo'" routerLink="/tasks" class="text-caption text-slate-400 hover:text-accent-soft shrink-0">Open</a>
                  <a *ngIf="it.kind === 'reminder'" routerLink="/reminders" class="text-caption text-slate-400 hover:text-accent-soft shrink-0">Open</a>
                  <div *ngIf="it.kind === 'project-task' && !it.done" class="basis-full sm:basis-auto flex items-center gap-3 shrink-0 pl-10 sm:pl-0">
                    <button (click)="flagBlocked(asProjectTask(it.ref))" class="text-caption text-slate-400 hover:text-flame shrink-0 whitespace-nowrap">Flag blocked</button>
                    <a [routerLink]="['/project', asProjectTask(it.ref).projectId]" class="text-caption text-slate-400 hover:text-accent-soft shrink-0">Open</a>
                  </div>
                  <a *ngIf="it.kind === 'project-todo'" [routerLink]="['/project', asProjectTodo(it.ref).projectId]" class="text-caption text-slate-400 hover:text-accent-soft shrink-0">Open</a>
                  <a *ngIf="it.kind === 'project-reminder'" [routerLink]="['/project', asProjectReminder(it.ref).projectId]" class="text-caption text-slate-400 hover:text-accent-soft shrink-0">Open</a>
                  <button *ngIf="it.kind === 'checkpoint-report'" (click)="toggleItem(it)" class="text-caption text-flame hover:text-white shrink-0">Report status →</button>
                </div>
              </div>
            </section>

            <!-- Team notices + pending approvals -->
            <div *ngIf="notices().length || pendingApprovalsCount() > 0" class="space-y-2 mt-4 animate-fade-up">
              <a *ngIf="pendingApprovalsCount() > 0" routerLink="/projects" class="card p-3 flex items-center justify-between gap-3 hover:border-accent/40 transition">
                <span class="text-body-sm text-white">⏳ {{ pendingApprovalsCount() }} team change{{ pendingApprovalsCount() === 1 ? '' : 's' }} waiting on your approval</span>
                <span class="text-slate-400">→</span>
              </a>
              <div *ngFor="let n of notices(); trackBy: trackByNotice" class="card p-3 flex items-center justify-between gap-3">
                <span class="text-body-sm text-slate-200">{{ n.message }}</span>
                <button (click)="dismissNotice(n)" class="text-caption text-slate-400 hover:text-white shrink-0">Dismiss</button>
              </div>
            </div>
          </div>

          <!-- Right column: YOUR GOAL(S) + PINNED NOTES -->
          <div>
            <ng-container *ngIf="data() as d; else goalsSkel">
            <section class="mb-6 lg:mb-0 animate-fade-up" *ngIf="d.goals.length">
            <h2 class="text-micro uppercase tracking-wider text-slate-400 mb-3">
              Your {{ d.goals.length > 1 ? 'goals' : 'goal' }}
            </h2>
            <div class="space-y-3">
              <a *ngFor="let g of d.goals; trackBy: trackByGoal" [routerLink]="g.hasPlan ? ['/goal', g.goalId] : ['/onboarding', g.goalId]"
                 class="glass-strong block p-4 md:p-5 hover:border-accent/40 transition">
                <div class="flex items-start justify-between gap-3">
                  <p class="text-heading text-white leading-snug">{{ g.title }}</p>
                  <div class="flex items-center gap-1 shrink-0">
                    <button type="button" (click)="askDelete(g, $event)"
                            [attr.aria-label]="'Delete goal: ' + g.title"
                            class="h-7 w-7 rounded-full flex items-center justify-center text-slate-500 hover:text-flame hover:bg-flame/10 transition">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                    <span class="text-slate-400">→</span>
                  </div>
                </div>
                <ng-container *ngIf="g.hasPlan; else discovering">
                  <div class="flex items-center gap-2 flex-wrap mt-3">
                    <span *ngIf="g.deadline" class="chip">🏁 {{ g.deadline | date: 'MMM d, yyyy' }}</span>
                    <span *ngIf="g.deadline" class="chip accent-text border-accent/30">⏳ {{ daysLeftFor(g.deadline) }} days left</span>
                    <span class="chip">🔥 {{ g.streak }}</span>
                    <span class="chip">📈 {{ g.momentumScore }}</span>
                    <span *ngIf="g.surplusMinutes" class="chip text-gold border-gold/30" title="Banked overtime — offsets postpones">⏱ +{{ g.surplusMinutes }} min banked</span>
                  </div>
                </ng-container>
                <ng-template #discovering>
                  <p class="text-body-sm text-accent-soft mt-2">Discovery in progress — tap to continue</p>
                </ng-template>
              </a>
            </div>
          </section>
            </ng-container>
            <ng-template #goalsSkel>
              <div class="skeleton-block h-5 w-28 mb-4"></div>
              <div class="glass-strong p-4 skeleton-shimmer mb-3 h-24"></div>
              <div class="glass-strong p-4 skeleton-shimmer h-24"></div>
            </ng-template>

            <!-- Pinned notes -->
            <div *ngIf="loadingNotes()" class="space-y-3 mt-6">
              <div class="skeleton-block h-4 w-28 mb-1"></div>
              <div class="card p-3 md:p-4 skeleton-shimmer h-16"></div>
            </div>
            <div *ngIf="!loadingNotes() && pinnedNotes().length" class="space-y-3 mt-6">
              <div class="flex items-center justify-between mb-1">
                <h3 class="text-micro uppercase tracking-wider text-slate-400">📌 Pinned notes</h3>
                <a routerLink="/notes" class="text-caption text-slate-400 hover:text-white">All notes →</a>
              </div>
              <a *ngFor="let n of pinnedNotes(); trackBy: trackByNote" routerLink="/notes"
                 class="rounded-2xl p-3 md:p-4 flex items-start gap-3 border shadow-card transition-all hover:brightness-105" [ngClass]="noteAccent(n.color)">
                <div class="flex-1 min-w-0" [ngClass]="noteFont(n.font)">
                  <p *ngIf="n.title" class="text-black/85 font-bold truncate">{{ n.title }}</p>
                  <p *ngIf="n.body" class="text-black/70 mt-0.5 line-clamp-2 whitespace-pre-wrap break-words">{{ n.body }}</p>
                </div>
                <span class="text-caption text-black/50 shrink-0">Open</span>
              </a>
            </div>
          </div>
        </div>

        <!-- New goal (full width on tablet/desktop, below the grid) — always actionable.
             md:block (not lg) so laptops at 125–150% scaling, which fall in the 768–1023px
             band where the mobile bottom-nav Create is hidden, still get a goal CTA. -->
        <div class="hidden md:block glass-strong p-6 animate-fade-up mt-6">
          <div class="flex items-start gap-4">
            <img src="icon.svg" alt="" class="h-11 w-11 shrink-0 rounded-2xl object-cover shadow-glow">
            <div class="flex-1 min-w-0">
              <h2 class="text-heading-lg text-white">Have a new goal in mind?</h2>
              <p class="text-body-sm text-slate-300 mt-1 leading-relaxed">
                Let's talk it through with Zenamaze — I'll dig into what really matters and turn it into a daily process you can actually follow.
              </p>
              <div class="flex flex-col sm:flex-row gap-3 mt-4">
                <input class="input flex-1 min-w-0" [(ngModel)]="newTitle"
                       placeholder="Name it in a line — or just start the chat"
                       (keydown.enter)="startGoal()" />
                <button class="btn-primary shrink-0" (click)="startGoal()" [disabled]="creating()">
                  {{ creating() ? 'Opening chat…' : '💬 Talk to Zenamaze →' }}
                </button>
              </div>
              <p class="text-caption text-slate-500 mt-2.5">Takes about 2 minutes. No forms — just a conversation.</p>
            </div>
          </div>
        </div>

        <!-- Progress section (desktop only) -->
        <div *ngIf="data() as d; else progressSkel" class="hidden md:block mt-10 animate-fade-up">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-heading-lg text-white">Progress</h2>
            <span class="chip border-accent/30 text-accent-soft">L<span [counter]="d.level" [counterDuration]="400"></span> · <span [counter]="d.points" [counterDuration]="600"></span> pts</span>
          </div>

          <!-- Analysis entry — sits directly under Progress -->
          <a routerLink="/progress" class="glass p-3.5 md:p-4 mb-5 flex items-center justify-between gap-3 hover:border-accent/40 transition">
            <div class="flex items-center gap-3 min-w-0">
              <span class="text-xl shrink-0">📊</span>
              <div class="min-w-0">
                <p class="text-body-sm text-white font-semibold">Full analysis &amp; roast</p>
                <p class="text-caption text-slate-400">Completion calendar, trends &amp; Zenamaze's brutal honesty.</p>
              </div>
            </div>
            <span class="text-slate-400 shrink-0">→</span>
          </a>

          <!-- Level + Rewards + Weekly heatmap -->
          <div class="glass p-5">
            <div class="md:grid md:grid-cols-2 md:gap-8">
              <!-- Left: Level + Points bar + badge -->
              <div>
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-3">
                    <span class="h-10 w-10 rounded-xl flex items-center justify-center text-white font-extrabold shadow-glow"
                          style="background-image:linear-gradient(135deg,#e8b64c,#ff7a45)"><span [counter]="d.level" [counterDuration]="400"></span></span>
                    <div>
                      <p class="text-white font-bold"><span [counter]="d.points" [counterDuration]="600"></span> pts</p>
                      <p class="text-caption text-slate-400"><span [counter]="d.pointsToNext" [counterDuration]="600"></span> pts to level {{ d.level + 1 }}</p>
                    </div>
                  </div>
                  <span *ngIf="rewardBadge(d) as badge" class="chip border-gold/40 text-gold">{{ badge }}</span>
                </div>
                <div class="h-2 rounded-full bg-ink-800 overflow-hidden"
                     role="progressbar" [attr.aria-valuenow]="100 - d.pointsToNext" aria-valuemin="0" aria-valuemax="100"
                     [attr.aria-label]="'Progress to level ' + (d.level + 1)">
                  <div class="h-full transition-all duration-700" style="background-image:linear-gradient(90deg,#e8b64c,#ff7a45)" [style.width.%]="100 - d.pointsToNext"></div>
                </div>
              </div>

              <!-- Right: Weekly heatmap -->
              <div class="mt-5 lg:mt-0">
                <div class="flex items-center gap-1.5">
                  <div *ngFor="let day of d.week" class="flex-1">
                    <div class="h-10 rounded-lg transition-all"
                         [attr.title]="(day.date | date: 'EEE, MMM d') + ' — ' + heatLabel(day.status)"
                         [ngClass]="{
                           'bg-gold': day.status === 'done',
                           'bg-accent/40': day.status === 'partial',
                           'bg-flame/50': day.status === 'missed',
                           'bg-white/5 ring-1 ring-accent animate-pulse-glow': day.status === 'today',
                           'bg-white/5': day.status === 'none'
                         }"></div>
                    <p class="text-caption text-slate-400 text-center mt-1">{{ day.date | date: 'EEEEE' }}</p>
                  </div>
                </div>
                <!-- Legend -->
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3">
                  <span class="inline-flex items-center gap-1.5 text-micro text-slate-400"><span class="h-2.5 w-2.5 rounded bg-gold"></span>Done</span>
                  <span class="inline-flex items-center gap-1.5 text-micro text-slate-400"><span class="h-2.5 w-2.5 rounded bg-accent/40"></span>Partial</span>
                  <span class="inline-flex items-center gap-1.5 text-micro text-slate-400"><span class="h-2.5 w-2.5 rounded bg-flame/50"></span>Missed</span>
                </div>
                <p class="text-caption mt-2" [ngClass]="d.focusDays >= 4 ? 'text-slate-400' : 'text-flame'">{{ focusCaption(d) }}</p>
              </div>
            </div>
          </div>

          <!-- Checkpoint + Revise -->
          <div *ngIf="d.currentCheckpoint as cp" class="glass p-5 mt-4">
            <div class="flex items-center justify-between">
              <p class="text-micro uppercase tracking-wider text-accent-soft">Next checkpoint · {{ cp.date | date: 'MMM d' }}</p>
              <button class="text-caption text-slate-400 hover:text-white" (click)="reviseOpen.set(!reviseOpen())">I'm behind — adjust</button>
            </div>
            <p class="text-body text-slate-100 mt-2">{{ cp.target }}</p>
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

          <!-- Behind banner -->
          <div *ngIf="d.behindPace >= 25" class="glass p-4 mt-4 border-flame/40 flex items-center gap-3">
            <span class="text-flame text-xl">⚠</span>
            <div>
              <p class="text-flame font-semibold">You're <span [counter]="d.behindPace" [counterDuration]="400"></span>% behind pace.</p>
              <p class="text-body-sm text-slate-400">Close a task today to stop the slide.</p>
            </div>
          </div>
        </div>

        <!-- Progress section skeleton (desktop) — shown until dashboard data lands -->
        <ng-template #progressSkel>
          <div class="hidden md:block mt-10 animate-fade-up" style="animation-delay:160ms">
            <div class="flex items-center justify-between mb-5">
              <div class="skeleton-block h-6 w-28"></div>
              <div class="skeleton-block h-6 w-24 rounded-full"></div>
            </div>
            <div class="glass p-5 skeleton-shimmer">
              <div class="md:grid md:grid-cols-2 md:gap-8">
                <div>
                  <div class="skeleton-block h-12 w-48 mb-3"></div>
                  <div class="skeleton-block h-2 w-full rounded-full"></div>
                </div>
                <div class="mt-5 lg:mt-0">
                  <div class="flex gap-1.5">
                    <div class="skeleton-block flex-1 h-10 rounded-lg" *ngFor="let _ of [1,2,3,4,5,6,7]"></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="glass p-5 mt-4 skeleton-shimmer h-20"></div>
          </div>
        </ng-template>

        <!-- Meme of the day — parked at the bottom; scroll down to face it. -->
        <a *ngIf="meme() as mm" routerLink="/progress"
           class="block rounded-2xl overflow-hidden mt-10 mb-4 border border-white/10 animate-fade-up hover:border-accent/40 transition">
          <p class="text-micro uppercase tracking-wider text-slate-400 text-center pt-3 pb-1">Meme of the day 👇</p>
          <div class="flex items-center justify-center bg-black">
            <img *ngIf="memeImg() && !memeImgFailed(); else memeEmoji" [src]="memeImg()" (error)="memeImgFailed.set(true)"
                 [alt]="mm.template || 'meme'" loading="lazy" class="max-h-72 w-auto object-contain" />
            <ng-template #memeEmoji><div class="py-10 text-center"><span class="text-6xl">{{ mm.emoji }}</span></div></ng-template>
          </div>
          <p *ngIf="mm.template" class="text-micro text-slate-500 text-center py-1.5 bg-black/30 normal-case">meme: {{ mm.template }}</p>
        </a>
    </div>

    <!-- Confirm-complete modal -->
    <div *ngIf="confirmTask() as ct" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50"
         (click)="confirmTask.set(null)" (keydown.escape)="confirmTask.set(null)" tabindex="-1">
      <div class="glass-strong p-6 w-full max-w-sm animate-fade-up text-center"
           role="dialog" aria-modal="true" aria-labelledby="confirmDoneTitle" (click)="$event.stopPropagation()">
        <p class="text-2xl mb-2">✅</p>
        <h3 id="confirmDoneTitle" class="text-heading text-white mb-1">Mark this done?</h3>
        <p class="text-body-sm text-slate-400 mb-5">"{{ ct.title }}"</p>
        <div class="flex gap-2">
          <button class="btn-ghost flex-1" (click)="confirmTask.set(null)">Not yet</button>
          <button class="btn-primary flex-1" (click)="doComplete(ct)" [disabled]="acting()">
            {{ acting() ? '…' : 'Yes, done!' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm-complete to-do modal -->
    <div *ngIf="confirmTodo() as ctd" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50"
         (click)="confirmTodo.set(null)" (keydown.escape)="confirmTodo.set(null)" tabindex="-1">
      <div class="glass-strong p-6 w-full max-w-sm animate-fade-up text-center"
           role="dialog" aria-modal="true" aria-labelledby="confirmTodoTitle" (click)="$event.stopPropagation()">
        <p class="text-2xl mb-2">✅</p>
        <h3 id="confirmTodoTitle" class="text-heading text-white mb-1">Mark this to-do done?</h3>
        <p class="text-body-sm text-slate-400 mb-1">"{{ ctd.title }}"</p>
        <p class="text-caption text-gold mb-5" *ngIf="ctd.goalId">Earns +{{ ctd.pointsValue }} pts toward your goal.</p>
        <p class="text-caption text-slate-400 mb-5" *ngIf="!ctd.goalId">Earns +{{ ctd.pointsValue }} pts.</p>
        <div class="flex gap-2">
          <button class="btn-ghost flex-1" (click)="confirmTodo.set(null)">Not yet</button>
          <button class="btn-primary flex-1" (click)="doCompleteTodo(ctd)" [disabled]="acting()">
            {{ acting() ? '…' : 'Yes, done!' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm-acknowledge reminder modal -->
    <div *ngIf="confirmReminder() as crm" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50"
         (click)="confirmReminder.set(null)" (keydown.escape)="confirmReminder.set(null)" tabindex="-1">
      <div class="glass-strong p-6 w-full max-w-sm animate-fade-up text-center"
           role="dialog" aria-modal="true" aria-labelledby="confirmReminderTitle" (click)="$event.stopPropagation()">
        <p class="text-2xl mb-2">🔔</p>
        <h3 id="confirmReminderTitle" class="text-heading text-white mb-1">Mark this reminder done?</h3>
        <p class="text-body-sm text-slate-400 mb-1">"{{ crm.title }}"</p>
        <p class="text-caption text-accent-soft mb-5" *ngIf="crm.recurrence !== 'none'">It'll come back {{ crm.recurrence }} — this clears it for today.</p>
        <div class="flex gap-2">
          <button class="btn-ghost flex-1" (click)="confirmReminder.set(null)">Not yet</button>
          <button class="btn-primary flex-1" (click)="doAckReminder(crm)" [disabled]="acting()">
            {{ acting() ? '…' : 'Yes, done!' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm-acknowledge TEAM reminder modal -->
    <div *ngIf="confirmProjectReminder() as cpr" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50"
         (click)="confirmProjectReminder.set(null)" (keydown.escape)="confirmProjectReminder.set(null)" tabindex="-1">
      <div class="glass-strong p-6 w-full max-w-sm animate-fade-up text-center"
           role="dialog" aria-modal="true" aria-labelledby="confirmProjectReminderTitle" (click)="$event.stopPropagation()">
        <p class="text-2xl mb-2">🔔</p>
        <h3 id="confirmProjectReminderTitle" class="text-heading text-white mb-1">Mark this team reminder done?</h3>
        <p class="text-body-sm text-slate-400 mb-1">"{{ cpr.title }}"</p>
        <p class="text-caption text-accent-soft mb-5" *ngIf="cpr.recurrence !== 'none'">It'll come back {{ cpr.recurrence }} — this clears it for today.</p>
        <div class="flex gap-2">
          <button class="btn-ghost flex-1" (click)="confirmProjectReminder.set(null)">Not yet</button>
          <button class="btn-primary flex-1" (click)="doAckProjectReminder(cpr)" [disabled]="acting()">
            {{ acting() ? '…' : 'Yes, done!' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm-delete-goal modal -->
    <div *ngIf="goalToDelete() as gd" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50"
         (click)="goalToDelete.set(null)" (keydown.escape)="goalToDelete.set(null)" tabindex="-1">
      <div class="glass-strong p-6 w-full max-w-sm animate-fade-up text-center"
           role="dialog" aria-modal="true" aria-labelledby="confirmDeleteTitle" (click)="$event.stopPropagation()">
        <p class="text-2xl mb-2">🗑️</p>
        <h3 id="confirmDeleteTitle" class="text-heading text-white mb-1">Delete this goal?</h3>
        <p class="text-body-sm text-slate-400 mb-1">"{{ gd.title }}"</p>
        <p class="text-caption text-slate-500 mb-5">This removes the goal and all its tasks. Can't be undone.</p>
        <div class="flex gap-2">
          <button class="btn-ghost flex-1" (click)="goalToDelete.set(null)" [disabled]="deleting()">Keep it</button>
          <button class="btn-primary flex-1 !bg-flame !border-flame" (click)="doDelete(gd)" [disabled]="deleting()">
            {{ deleting() ? '…' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Zenamaze toast (motivation / adjustment) -->
    <div *ngIf="toast() as msg" role="status" aria-live="polite"
         class="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-pop">
      <div class="glass-strong px-4 py-3.5 flex items-start gap-3 border-accent/30">
        <img src="icon.svg" alt="" class="h-8 w-8 shrink-0 rounded-full object-cover shadow-glow">
        <p class="text-slate-100 text-sm leading-snug">{{ msg }}</p>
      </div>
    </div>

    <app-focus-timer *ngIf="activeTimer() as t" [task]="t"
      (done)="doComplete($event); activeTimer.set(null)"
      (close)="onFocusClose()"></app-focus-timer>

    <app-report-modal *ngIf="reportModal() as rm"
      [mode]="rm.mode" [projectId]="rm.projectId" [goalId]="rm.goalId" [checkpointId]="rm.checkpointId"
      [checkpointTarget]="rm.checkpointTarget" [taskId]="rm.taskId" [taskTitle]="rm.taskTitle"
      (closed)="closeReportModal()"></app-report-modal>

    <app-bottom-nav></app-bottom-nav>
  `,
  styles: [`
    /* Compact Impact-meme caption for the home meme card. */
    .meme-text-sm {
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      line-height: 1.1;
      color: #fff;
      font-size: clamp(0.8rem, 2.6vw, 1.05rem);
      text-shadow: -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000;
    }
  `],
})
export class DashboardComponent implements OnInit {
  data = signal<Dashboard | null>(null);
  tasks = signal<Task[]>([]);
  todos = signal<Todo[]>([]);
  reminders = signal<Reminder[]>([]);
  pinnedNotes = signal<Note[]>([]);
  // Team feed — one consolidated fetch (see ApiService.teamToday()).
  projectTasks = signal<MyProjectTask[]>([]);
  projectTodos = signal<MyProjectTodo[]>([]);
  projectReminders = signal<ProjectReminder[]>([]);
  pendingCheckpointReports = signal<PendingCheckpointReport[]>([]);
  pendingApprovalsCount = signal(0);
  notices = signal<ProjectNotice[]>([]);
  reportModal = signal<{ mode: 'checkpoint' | 'blocker'; projectId: string; goalId: string; checkpointId: string; checkpointTarget: string; taskId: string; taskTitle: string } | null>(null);
  roast = signal<string | null>(null);
  meme = signal<AnalysisMeme | null>(null);
  memeImg = computed(() => memegenUrl(this.meme()));
  memeImgFailed = signal(false);
  private roastRate = signal(0);
  roastTone = computed<'good' | 'mid' | 'bad'>(() => {
    const r = this.roastRate();
    return r >= 70 ? 'good' : r >= 40 ? 'mid' : 'bad';
  });

  // Per-section initial-load flags so each part shows its own skeleton and
  // reveals as soon as ITS call returns — the slow dashboard call no longer
  // holds back to-dos/reminders. Flipped false on first response and never set
  // true again, so silent refreshes (after actions) don't flash skeletons.
  loadingDash = signal(true);
  loadingTodos = signal(true);
  loadingReminders = signal(true);
  loadingNotes = signal(true);
  allLoaded = computed(() => !this.loadingDash() && !this.loadingTodos() && !this.loadingReminders());
  newTitle = '';
  creating = signal(false);
  activeTimer = signal<Task | null>(null);

  rewardBadge = rewardBadge;
  focusCaption = focusCaption;

  confirmTask = signal<Task | null>(null);
  confirmTodo = signal<Todo | null>(null);
  confirmReminder = signal<Reminder | null>(null);
  confirmProjectReminder = signal<ProjectReminder | null>(null);
  goalToDelete = signal<GoalSummary | null>(null);
  deleting = signal(false);
  acting = signal(false);
  toast = signal<string | null>(null);
  reviseOpen = signal(false);
  reviseText = '';
  revising = signal(false);

  // Identity trackers so list refreshes patch existing rows instead of tearing
  // down and rebuilding every card (which repaints all the glass surfaces).
  trackByTask = (_: number, t: Task) => t.taskId;
  trackByTodo = (_: number, t: Todo) => t.todoId;
  trackByReminder = (_: number, r: Reminder) => r.reminderId;
  trackByNote = (_: number, n: Note) => n.noteId;
  trackByGoal = (_: number, g: GoalSummary) => g.goalId;
  trackByNotice = (_: number, n: ProjectNotice) => n.noticeId;

  // Prefer the server's resolved first name; fall back to the stored profile.
  firstName = computed(() => {
    const dn = this.data()?.userName;
    if (dn) return dn;
    const n = this.auth.user()?.name?.trim();
    return n ? n.split(/\s+/)[0] : 'there';
  });

  // Primary goal's title — so the "days left" stat says which goal it counts down to.
  primaryGoalTitle = computed(() => {
    const d = this.data();
    if (!d) return '';
    const g = (d.goals || []).find((x) => x.goalId === d.primaryGoalId) || (d.goals || [])[0];
    return g ? g.title : '';
  });

  // The single source of truth for the "Today" list: goal focus tasks, to-dos, and
  // reminders merged into one array and sorted by priority (see rankOf).
  todayItems = computed<TodayItem[]>(() => {
    const items: TodayItem[] = [];
    const goalName = (id: string | null | undefined) => {
      if (!id) return '';
      const g = (this.data()?.goals || []).find((x) => x.goalId === id);
      return g ? g.title : '';
    };

    for (const t of this.tasks()) {
      const done = t.status === 'done' || t.status === 'postponed';
      items.push({
        kind: 'task', id: 'task:' + t.taskId, title: t.title, icon: '🎯', kindLabel: 'Focus',
        meta: this.taskMeta(t), goalTitle: goalName(t.goalId), done, urgent: t.status === 'missed', high: false, sort: 0, ref: t,
      });
    }
    for (const td of this.todos()) {
      const done = td.status === 'done';
      items.push({
        kind: 'todo', id: 'todo:' + td.todoId, title: td.title, icon: '✅', kindLabel: 'To-do',
        meta: this.todoMeta(td), goalTitle: goalName(td.goalId), done, urgent: !!td.overdue && !done, high: td.priority === 'high', sort: 0, ref: td,
      });
    }
    for (const rm of this.reminders()) {
      const done = this.reminderDone(rm);
      items.push({
        kind: 'reminder', id: 'rem:' + rm.reminderId, title: rm.title, icon: '🔔', kindLabel: 'Reminder',
        meta: this.reminderMeta(rm), goalTitle: goalName(rm.goalId), done, urgent: !!rm.overdue && !done, high: rm.priority === 'high', sort: 0, ref: rm,
      });
    }
    for (const pt of this.projectTasks()) {
      items.push({
        kind: 'project-task', id: 'ptask:' + pt.projectTaskId, title: pt.title, icon: '🧑‍🤝‍🧑', kindLabel: 'Team task',
        meta: this.projectTaskMeta(pt), goalTitle: '', done: pt.status === 'done', urgent: pt.overdue, high: false, sort: 0, ref: pt, projectName: pt.projectName,
      });
    }
    for (const pd of this.projectTodos()) {
      items.push({
        kind: 'project-todo', id: 'ptodo:' + pd.projectTodoId, title: pd.title, icon: '👥', kindLabel: 'Team to-do',
        meta: '', goalTitle: '', done: pd.status === 'done', urgent: !!pd.overdue, high: pd.priority === 'high', sort: 0, ref: pd, projectName: pd.projectName,
      });
    }
    for (const pr of this.projectReminders()) {
      const done = this.reminderDone(pr);
      items.push({
        kind: 'project-reminder', id: 'prem:' + pr.projectReminderId, title: pr.title, icon: '🔔', kindLabel: 'Team reminder',
        meta: this.reminderMeta(pr), goalTitle: '', done, urgent: !!pr.overdue && !done, high: pr.priority === 'high', sort: 0, ref: pr, projectName: pr.projectName,
      });
    }
    for (const cr of this.pendingCheckpointReports()) {
      items.push({
        kind: 'checkpoint-report', id: 'cprep:' + cr.projectCheckpointId, title: `Checkpoint: ${cr.target}`, icon: '📋', kindLabel: 'Checkpoint report due',
        meta: cr.date, goalTitle: cr.goalTitle, done: false, urgent: true, high: false, sort: 0, ref: cr, projectName: cr.projectName,
      });
    }

    for (const it of items) it.sort = this.rankOf(it);
    return items.sort((a, b) => a.sort - b.sort);
  });

  todayDone = computed(() => this.todayItems().filter((i) => i.done).length);
  todayTotal = computed(() => this.todayItems().length);

  trackByItem = (_: number, it: TodayItem) => it.id;

  // Priority buckets, lower = higher on the list:
  // overdue/missed → high priority → timed reminders → goal focus → to-dos → loose reminders → done.
  private rankOf(it: TodayItem): number {
    if (it.done) return 900;
    if (it.urgent) return 100;
    if (it.high) return 200;
    if ((it.kind === 'reminder' || it.kind === 'project-reminder') && !!(it.ref as Reminder).fireTime) return 300;
    if (it.kind === 'task') return 400;
    if (it.kind === 'todo') return 500;
    if (it.kind === 'project-task') return 450;
    if (it.kind === 'project-todo') return 550;
    if (it.kind === 'project-reminder') return 610;
    return 600;
  }

  private projectTaskMeta(t: MyProjectTask): string {
    const parts: string[] = [];
    if (t.weight) parts.push(`weight ${t.weight}`);
    if (t.dueDate) parts.push(t.overdue ? `overdue since ${t.dueDate}` : `due ${t.dueDate}`);
    return parts.join(' · ');
  }

  // Narrow a merged item's ref for the project-item-only template branches.
  asProjectTask(ref: TodayItem['ref']): MyProjectTask {
    return ref as MyProjectTask;
  }
  asProjectTodo(ref: TodayItem['ref']): MyProjectTodo {
    return ref as MyProjectTodo;
  }
  asCheckpointReport(ref: TodayItem['ref']): PendingCheckpointReport {
    return ref as PendingCheckpointReport;
  }
  asProjectReminder(ref: TodayItem['ref']): ProjectReminder {
    return ref as ProjectReminder;
  }

  private taskMeta(t: Task): string {
    const parts: string[] = [];
    if (t.estMinutes) parts.push(`${t.estMinutes} min`);
    if (t.type) parts.push(t.type);
    if (t.status === 'missed') parts.push('missed');
    if (t.status === 'postponed') parts.push('moved to tomorrow');
    return parts.join(' · ');
  }

  private todoMeta(td: Todo): string {
    const parts: string[] = [];
    const when = this.todoWhen(td);
    if (when) parts.push(when);
    parts.push(`+${td.pointsValue} pts`);
    return parts.join(' · ');
  }

  private reminderMeta(rm: Reminder | ProjectReminder): string {
    const parts: string[] = [];
    if (rm.whenLabel) parts.push(rm.whenLabel);
    if (rm.recurrence === 'custom') parts.push(`↻ every ${rm.intervalDays} days`);
    else if (rm.recurrence !== 'none') parts.push(`↻ ${rm.recurrence}`);
    return parts.join(' · ');
  }

  // Narrow a merged item's ref for the task-only template branches.
  asTask(ref: TodayItem['ref']): Task {
    return ref as Task;
  }

  // Route the checkbox tap to the right confirm flow by kind.
  toggleItem(it: TodayItem) {
    if (it.kind === 'checkpoint-report') {
      const cr = this.asCheckpointReport(it.ref);
      this.reportModal.set({ mode: 'checkpoint', projectId: cr.projectId, goalId: cr.projectGoalId, checkpointId: cr.projectCheckpointId, checkpointTarget: cr.target, taskId: '', taskTitle: '' });
      return;
    }
    if (it.done) return;
    if (it.kind === 'task') this.askComplete(it.ref as Task);
    else if (it.kind === 'todo') this.askCompleteTodo(it.ref as Todo);
    else if (it.kind === 'reminder') this.askAckReminder(it.ref as Reminder);
    else if (it.kind === 'project-task') this.doCompleteProjectTask(this.asProjectTask(it.ref));
    else if (it.kind === 'project-todo') this.doCompleteProjectTodo(this.asProjectTodo(it.ref));
    else if (it.kind === 'project-reminder') this.askAckProjectReminder(this.asProjectReminder(it.ref));
  }

  doCompleteProjectTask(t: MyProjectTask) {
    this.projectTasks.update((list) => list.map((x) => (x.projectTaskId === t.projectTaskId ? { ...x, status: 'done' } : x)));
    this.api.completeProjectTask(t.projectTaskId).subscribe({ error: () => this.loadTeamToday() });
  }

  doCompleteProjectTodo(t: MyProjectTodo) {
    this.projectTodos.update((list) => list.map((x) => (x.projectTodoId === t.projectTodoId ? { ...x, status: 'done' } : x)));
    this.api.completeProjectTodo(t.projectTodoId).subscribe({ error: () => this.loadTeamToday() });
  }

  flagBlocked(t: MyProjectTask) {
    this.reportModal.set({ mode: 'blocker', projectId: '', goalId: '', checkpointId: '', checkpointTarget: '', taskId: t.projectTaskId, taskTitle: t.title });
  }

  closeReportModal() {
    this.reportModal.set(null);
    this.loadTeamToday();
  }

  dismissNotice(n: ProjectNotice) {
    this.notices.update((list) => list.filter((x) => x.noticeId !== n.noticeId));
    this.api.markProjectNoticeSeen(n.noticeId).subscribe({ error: () => {} });
  }

  constructor(private api: ApiService, private auth: AuthService, private router: Router, private bus: ReminderBus, private onboarding: OnboardingService) {}

  ngOnInit(): void {
    this.load();
    // If a Pip-guided run survived the sign-up, this drops the user into the
    // first real-action step (the onboarding host renders the coach).
    this.onboarding.beginTour();
  }

  load() {
    this.api.dashboard().subscribe({
      next: (d) => {
        this.data.set(d);
        this.tasks.set(d.today.tasks);
        this.loadingDash.set(false);
        this.celebrateMedals(d.newlyUnlockedMedals);
      },
      error: () => this.loadingDash.set(false),
    });
    this.loadTodos();
    this.loadReminders();
    this.loadNotes();
    this.loadRoast();
    this.loadTeamToday();
  }

  // Team items (project tasks/to-dos/checkpoint-reports-due) — one consolidated
  // fetch, loaded independently of the personal Today list so a slow/failed
  // team fanout never blocks the page's core skeleton from resolving.
  loadTeamToday() {
    this.api.teamToday().subscribe({
      next: (t) => {
        this.projectTasks.set(t.tasks || []);
        this.projectTodos.set(t.todos || []);
        this.projectReminders.set(t.reminders || []);
        this.pendingCheckpointReports.set(t.checkpointsPendingReport || []);
        this.pendingApprovalsCount.set(t.pendingApprovalsCount || 0);
        this.notices.set(t.notices || []);
      },
      error: () => {},
    });
  }

  // Pull the Zenamaze roast (and completion rate for tone) from the analysis endpoint.
  // Non-blocking: the card only appears once it lands.
  loadRoast() {
    this.memeImgFailed.set(false);
    this.api.analysis().subscribe({
      next: (a) => { this.roast.set(a.roast); this.roastRate.set(a.summary.completionRate); this.meme.set(a.meme || null); },
      error: () => {},
    });
  }

  loadTodos() {
    this.api.todayTodos().subscribe({
      next: (r) => { this.todos.set(r.todos || []); this.loadingTodos.set(false); },
      error: () => this.loadingTodos.set(false),
    });
  }

  loadReminders() {
    this.api.remindersForDay().subscribe({
      next: (r) => { this.reminders.set(r.reminders || []); this.loadingReminders.set(false); },
      error: () => this.loadingReminders.set(false),
    });
  }

  loadNotes() {
    this.api.listNotes().subscribe({
      next: (r) => { this.pinnedNotes.set((r.notes || []).filter((n) => n.pinned)); this.loadingNotes.set(false); },
      error: () => this.loadingNotes.set(false),
    });
  }

  // Colored-paper background per note color (full literal strings so Tailwind keeps them).
  noteAccent(color: string): string {
    switch (color) {
      case 'blue': return 'bg-sky-100 border-sky-300';
      case 'green': return 'bg-emerald-100 border-emerald-300';
      case 'pink': return 'bg-pink-100 border-pink-300';
      default: return 'bg-amber-100 border-amber-300';
    }
  }

  // Note typeface — matches the Notes page so a handwritten note stays handwritten here.
  noteFont(font?: string): string {
    switch (font) {
      case 'hand': return 'font-hand text-lg leading-tight';
      case 'marker': return 'font-marker tracking-wide';
      case 'serif': return 'font-display';
      default: return 'font-sans';
    }
  }

  greetingTime(): string {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }

  daysLeftFor(deadline: string): number {
    const ms = new Date(deadline).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 86400000));
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

  private showToast(msg: string) {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(null), 6000);
  }

  // Fire confetti + a toast when a medal was just unlocked (backend only reports
  // each medal as "newly unlocked" once, so this won't re-fire on later loads).
  private celebrateMedals(medals: Dashboard['newlyUnlockedMedals']) {
    if (!medals || !medals.length) return;
    try {
      confetti({ particleCount: 130, spread: 75, origin: { y: 0.35 } });
    } catch {
      /* best-effort */
    }
    const m = medals[0];
    const more = medals.length > 1 ? ` +${medals.length - 1} more` : '';
    this.showToast(`${m.emoji} Medal unlocked: ${m.label}!${more} Tap Score to share.`);
  }

  askComplete(t: Task) {
    if (t.status !== 'pending') return;
    this.confirmTask.set(t);
  }

  doComplete(t: Task) {
    this.acting.set(true);
    this.api.completeTask(t.taskId).subscribe({
      next: (r) => {
        this.acting.set(false);
        this.confirmTask.set(null);
        this.tasks.update((list) => list.map((x) => (x.taskId === t.taskId ? { ...x, status: 'done' } : x)));
        const d = this.data();
        if (d) {
          const gained = r.points != null ? r.points - d.points : 0;
          this.data.set({
            ...d,
            momentum: r.momentum,
            streak: r.streak,
            points: r.points ?? d.points,
            level: r.level ?? d.level,
            pointsToNext: r.pointsToNext ?? d.pointsToNext,
            today: { ...d.today, done: d.today.done + 1 },
          });
          if (gained > 0) this.showToast(`+${gained} pts · ${r.message}`);
          else if (r.message) this.showToast(r.message);
        } else if (r.message) {
          this.showToast(r.message);
        }
      },
      error: () => {
        this.acting.set(false);
        this.confirmTask.set(null);
        this.load();
      },
    });
  }

  askCompleteTodo(td: Todo) {
    if (td.status === 'done') return;
    this.confirmTodo.set(td);
  }

  doCompleteTodo(td: Todo) {
    this.acting.set(true);
    this.api.completeTodo(td.todoId).subscribe({
      next: (r) => {
        this.acting.set(false);
        this.confirmTodo.set(null);
        // Retain in today's focus, just marked done.
        this.todos.update((list) => list.map((x) => (x.todoId === td.todoId ? { ...x, status: 'done' } : x)));
        const d = this.data();
        if (d) {
          this.data.set({
            ...d,
            points: r.points ?? d.points,
            level: r.level ?? d.level,
            pointsToNext: r.pointsToNext ?? d.pointsToNext,
          });
        }
        this.showToast(`Done · +${r.earned ?? td.pointsValue} pts${td.goalId ? ' toward your goal' : ''}`);
      },
      error: () => { this.acting.set(false); this.confirmTodo.set(null); this.showToast('Could not save — try again'); this.loadTodos(); },
    });
  }

  // A reminder is "done for today" if acknowledged (one-off done, or recurring
  // acked today). Kept visible in Today's focus — just marked done.
  reminderDone(rm: Reminder | ProjectReminder): boolean {
    return rm.status === 'done' || rm.doneToday;
  }

  askAckReminder(rm: Reminder) {
    if (this.reminderDone(rm)) return;
    this.confirmReminder.set(rm);
  }

  doAckReminder(rm: Reminder) {
    this.acting.set(true);
    this.api.ackReminder(rm.reminderId).subscribe({
      next: (res) => {
        this.acting.set(false);
        this.confirmReminder.set(null);
        // Retain in today's focus, marked done (use server's decorated copy).
        this.reminders.update((list) => list.map((x) => (x.reminderId === rm.reminderId ? res.reminder : x)));
        this.bus.notifyChanged();
        this.showToast(rm.recurrence !== 'none' ? `Done for today · repeats ${rm.recurrence}` : 'Reminder done');
      },
      error: () => { this.acting.set(false); this.confirmReminder.set(null); this.showToast('Could not save — try again'); this.loadReminders(); },
    });
  }

  askAckProjectReminder(rm: ProjectReminder) {
    if (this.reminderDone(rm)) return;
    this.confirmProjectReminder.set(rm);
  }

  doAckProjectReminder(rm: ProjectReminder) {
    this.acting.set(true);
    this.api.ackProjectReminder(rm.projectReminderId).subscribe({
      next: (res) => {
        this.acting.set(false);
        this.confirmProjectReminder.set(null);
        this.projectReminders.update((list) => list.map((x) => (x.projectReminderId === rm.projectReminderId ? { ...res.reminder, projectName: rm.projectName } : x)));
        this.bus.notifyChanged();
        this.showToast(rm.recurrence !== 'none' ? `Done for today · repeats ${rm.recurrence}` : 'Reminder done');
      },
      error: () => { this.acting.set(false); this.confirmProjectReminder.set(null); this.showToast('Could not save — try again'); this.loadTeamToday(); },
    });
  }

  todoWhen(td: Todo): string {
    const fmt = (s: string | null) => (s ? new Date(s + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '');
    switch (td.schedule) {
      case 'date': return fmt(td.dueDate);
      case 'deadline': return td.dueDate ? 'by ' + fmt(td.dueDate) : '';
      case 'span': return `${fmt(td.startDate)}–${fmt(td.endDate)}`;
      default: return '';
    }
  }

  // Minutes of focus banked so far on a pending task (from paused/ended sessions).
  spentMin(t: Task): number {
    return Math.floor((t.spentMs ?? 0) / 60000);
  }

  // Focus progress vs. the task's estimate, clamped to 100%.
  focusPct(t: Task): number {
    return t.estMinutes ? Math.min(100, Math.round((t.spentMs ?? 0) / (t.estMinutes * 60000) * 100)) : 0;
  }

  // On leaving the focus timer, sync the task's freshly-saved spentMs back into the
  // list so the progress bar renders (the timer mutates the shared task object).
  onFocusClose() {
    const t = this.activeTimer();
    if (t) this.tasks.update((l) => l.map((x) => (x.taskId === t.taskId ? { ...x, spentMs: t.spentMs } : x)));
    this.activeTimer.set(null);
  }

  postpone(t: Task) {
    this.tasks.update((list) => list.map((x) => (x.taskId === t.taskId ? { ...x, status: 'postponed' } : x)));
    this.api.postponeTask(t.taskId).subscribe({
      next: (r) => { if (r.message) this.showToast(r.message); },
      error: () => this.load(),
    });
  }

  // Open the delete confirmation without following the goal card's router link.
  askDelete(g: GoalSummary, ev: Event) {
    ev.preventDefault();
    ev.stopPropagation();
    this.goalToDelete.set(g);
  }

  doDelete(g: GoalSummary) {
    if (this.deleting()) return;
    this.deleting.set(true);
    this.api.deleteGoal(g.goalId).subscribe({
      next: () => {
        this.deleting.set(false);
        this.goalToDelete.set(null);
        this.showToast('Goal deleted.');
        this.load(); // refresh goals + today's tasks (its tasks are gone now)
      },
      error: () => {
        this.deleting.set(false);
        this.showToast('Could not delete that — try again in a moment.');
      },
    });
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
        this.showToast("Plan adjusted — I've re-paced things so you still hit your deadline.");
        this.load();
      },
      error: () => this.revising.set(false),
    });
  }

  startGoal() {
    if (this.creating()) return;
    const title = this.newTitle.trim(); // optional seed — Zenamaze's opening question captures the goal when blank
    this.creating.set(true);
    this.api.createGoal(title).subscribe({
      next: (g) => this.router.navigate(['/onboarding', g.goalId]),
      error: () => this.creating.set(false),
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
