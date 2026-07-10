import { Component, ElementRef, HostListener, OnInit, ViewChild, computed, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { CanComponentDeactivate } from '../../core/unsaved-changes.guard';
import { ChatMessage, FocusPatch, Goal, OneOffTask, Plan, RecurringTask, RevisionDiff, RevisionDiffState, Todo } from '../../core/models';
import { OnboardingService } from '../../core/onboarding.service';
import { PIP } from '../../core/onboarding-script';
import { BottomNavComponent } from '../../shared/bottom-nav.component';
import { TopBarComponent } from '../../shared/top-bar.component';
import { PipMascotComponent } from '../../shared/pip-mascot.component';

// Applied-revision count at which the "planning, not doing" nudge shows. Mirrors
// REVISION_NUDGE_THRESHOLD on the backend.
const REVISION_NUDGE_THRESHOLD = 5;

// Build a per-item diff of a proposed (revised) plan against the current plan,
// for the focus tasks and one-off/to-do items only. Pure + standalone so it's
// unit-testable. Focus tasks match by stable id then normalized title; one-offs
// match by normalized title, and carry the real linked to-do (if any) so a
// dropped item can be cascade-deleted from the user's actual to-do list.
export function buildRevisionDiff(
  oldPlan: Plan | null,
  proposedPlan: Plan | null,
  goalTodos: Todo[],
): RevisionDiff {
  const norm = (s: string | undefined | null): string => (s || '').trim().toLowerCase();

  // --- Focus (recurring) tasks ---
  const oldFocus = oldPlan?.recurringTasks || [];
  const propFocus = proposedPlan?.recurringTasks || [];
  const focusKey = (t: RecurringTask): string => (t.id ? `id:${t.id}` : `t:${norm(t.title)}`);
  const focus: RevisionDiff['focus'] = [];
  const usedFocus = new Set<number>();
  for (const p of propFocus) {
    let oi = oldFocus.findIndex((o, i) => !usedFocus.has(i) && !!o.id && !!p.id && o.id === p.id);
    if (oi < 0) oi = oldFocus.findIndex((o, i) => !usedFocus.has(i) && norm(o.title) === norm(p.title));
    if (oi >= 0) {
      usedFocus.add(oi);
      const o = oldFocus[oi];
      const changed = norm(o.title) !== norm(p.title) || (o.estMinutes || 0) !== (p.estMinutes || 0);
      focus.push({ key: focusKey(p), state: changed ? 'changed' : 'unchanged', old: o, proposed: p });
    } else {
      focus.push({ key: focusKey(p), state: 'added', proposed: p });
    }
  }
  oldFocus.forEach((o, i) => {
    if (!usedFocus.has(i)) focus.push({ key: `old:${focusKey(o)}`, state: 'removed', old: o });
  });

  // --- One-off tasks / to-dos ---
  const oldOne = oldPlan?.oneOffTasks || [];
  const propOne = proposedPlan?.oneOffTasks || [];
  const todoByTitle = new Map<string, Todo>();
  for (const t of goalTodos) todoByTitle.set(norm(t.title), t);
  const todos: RevisionDiff['todos'] = [];
  const usedOne = new Set<number>();
  for (const p of propOne) {
    const oi = oldOne.findIndex((o, i) => !usedOne.has(i) && norm(o.title) === norm(p.title));
    const todo = todoByTitle.get(norm(p.title));
    if (oi >= 0) {
      usedOne.add(oi);
      const o = oldOne[oi];
      const changed = (o.dueDate || '') !== (p.dueDate || '');
      todos.push({ key: `todo:${norm(p.title)}`, state: changed ? 'changed' : 'unchanged', old: o, proposed: p, todo });
    } else {
      todos.push({ key: `todo:${norm(p.title)}`, state: 'added', proposed: p, todo });
    }
  }
  oldOne.forEach((o, i) => {
    if (!usedOne.has(i)) {
      const todo = todoByTitle.get(norm(o.title));
      todos.push({ key: `todo-old:${norm(o.title)}`, state: 'removed', old: o, todo });
    }
  });

  return { focus, todos };
}

@Component({
  selector: 'app-plan',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, BottomNavComponent, TopBarComponent, PipMascotComponent],
  template: `
    <app-top-bar *ngIf="!guest"></app-top-bar>

    <div class="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto w-full px-4 md:px-6 lg:px-8 pt-6 md:pt-8 lg:pt-10" [class.pb-28]="!guest" [class.pb-10]="guest" *ngIf="goal() as g">
      <a [routerLink]="guest ? '/' : '/dashboard'" class="text-body-sm text-slate-400 hover:text-white inline-flex items-center gap-1 mb-4 md:mb-6">
        ← {{ guest ? 'Home' : 'Dashboard' }}
      </a>

      <div class="animate-fade-up max-w-3xl">
        <p class="text-micro uppercase tracking-wider text-accent-soft mb-2">Your plan</p>
        <h1 class="text-display md:text-display-lg gradient-text">{{ g.plan?.goalRestated || g.title }}</h1>
        <p *ngIf="g.plan?.coreMotivation" class="serif-display text-heading-xl md:text-display text-slate-300 mt-5 italic leading-snug">
          "{{ g.plan?.coreMotivation }}"
        </p>

        <!-- Concrete deadline -->
        <div *ngIf="g.plan?.deadlineDate as dd" class="mt-5 inline-flex items-center gap-2.5 glass px-4 py-2.5">
          <span class="text-lg">🏁</span>
          <span class="text-slate-200 text-body-sm font-medium">Commit by <span class="text-white font-bold">{{ dd | date: 'MMM d, yyyy' }}</span></span>
        </div>
      </div>

      <!-- 2-col grid on lg+ for sections -->
      <div class="lg:grid lg:grid-cols-2 lg:gap-6 xl:gap-8">
        <!-- Left column -->
        <div>
          <!-- Keystone commitment(s) — editable weekday schedule + pause -->
          <div class="card p-5 md:p-6 mt-8 animate-fade-up border-accent/30 shadow-glow" style="animation-delay:100ms">
            <p class="text-micro uppercase tracking-wider text-accent-soft mb-3">Your commitment</p>
            <div *ngFor="let t of g.plan?.recurringTasks; let i = index" class="py-2 border-b border-white/5 last:border-0">
              <div class="flex items-center gap-3">
                <span class="h-9 w-9 rounded-xl bg-accent/15 text-accent-soft flex items-center justify-center shrink-0">✦</span>
                <div class="min-w-0 flex-1">
                  <p class="text-white font-semibold text-body-sm md:text-body">{{ t.title }}</p>
                  <p class="text-caption text-slate-400">{{ t.estMinutes }} min · {{ countLabel(t) }}</p>
                </div>
                <span *ngIf="isPaused(t)" class="chip shrink-0 text-flame border-flame/40">
                  Paused · {{ pausedDate(t) | date: 'MMM d' }}
                </span>
              </div>

              <!-- Weekday picker + pause controls (owners only, not guest preview) -->
              <ng-container *ngIf="!guest">
                <div class="flex flex-wrap gap-1.5 mt-3">
                  <button *ngFor="let d of weekDays" type="button"
                          (click)="toggleDay(t, d.value)"
                          [disabled]="saving()"
                          class="h-8 w-8 rounded-lg text-caption font-semibold transition-colors disabled:opacity-50"
                          [ngClass]="isDaySelected(t, d.value) ? 'bg-accent text-white' : 'bg-white/5 text-slate-400 hover:text-white'">
                    {{ d.label }}
                  </button>
                </div>

                <div class="flex flex-wrap items-center gap-2 mt-3">
                  <ng-container *ngIf="!isPaused(t)">
                    <button type="button" class="btn-ghost text-caption px-3 py-1.5" [disabled]="saving()" (click)="pausePreset(t, 7)">Pause 1 week</button>
                    <button type="button" class="btn-ghost text-caption px-3 py-1.5" [disabled]="saving()" (click)="pauseMonths(t, 1)">Pause 1 month</button>
                    <label class="btn-ghost text-caption px-3 py-1.5 cursor-pointer">
                      Pause until…
                      <input type="date" class="sr-only" [min]="tomorrowStr()" (change)="pauseUntil(t, $event)" />
                    </label>
                  </ng-container>
                  <button *ngIf="isPaused(t)" type="button" class="btn-primary text-caption px-3 py-1.5" [disabled]="saving()" (click)="resume(t)">Resume now</button>
                </div>
              </ng-container>
            </div>
          </div>

          <!-- Milestones timeline -->
          <div class="mt-8 animate-fade-up" style="animation-delay:200ms" *ngIf="g.plan?.milestones?.length">
            <h2 class="text-heading-lg text-white mb-4">Milestones</h2>
            <ol class="relative border-l border-white/10 ml-3 space-y-6">
              <li *ngFor="let m of g.plan?.milestones; let i = index" class="ml-6">
                <span class="absolute -left-[9px] h-4 w-4 rounded-full bg-accent ring-4 ring-ink-950"></span>
                <p class="text-white font-medium">{{ m.title }}</p>
                <p class="text-caption text-slate-400">{{ m.targetDate | date: 'MMM d, yyyy' }}</p>
              </li>
            </ol>
          </div>
        </div>

        <!-- Right column -->
        <div>
          <!-- Checkpoints -->
          <div class="mt-8 lg:mt-0 animate-fade-up" style="animation-delay:250ms" *ngIf="g.plan?.checkpoints?.length">
            <h2 class="text-heading-lg text-white mb-2">Checkpoints</h2>
            <p class="text-body-sm text-slate-400 mb-4">Honest self-checks. Where you should be if you keep showing up.</p>
            <div class="space-y-2">
              <div *ngFor="let c of g.plan?.checkpoints" class="card px-4 py-3 flex gap-3 items-start">
                <span class="chip shrink-0">{{ c.date | date: 'MMM d' }}</span>
                <span class="text-body-sm text-slate-200">{{ c.target }}</span>
              </div>
            </div>
          </div>

          <!-- One-off tasks — one-tap add each (or all) to your dated to-dos -->
          <div class="mt-8 animate-fade-up" style="animation-delay:300ms" *ngIf="g.plan?.oneOffTasks?.length">
            <div class="flex items-center justify-between gap-2 mb-4">
              <h2 class="text-heading-lg text-white">Key one-off tasks</h2>
              <button *ngIf="!guest" class="chip border-accent/30 text-accent-soft hover:border-accent/60 transition shrink-0" (click)="addAllOneOffAsTodos()">+ Add all to to-dos</button>
            </div>
            <div class="space-y-2">
              <div *ngFor="let t of g.plan?.oneOffTasks" class="card px-4 py-3 flex justify-between items-center gap-3">
                <div class="min-w-0 flex-1">
                  <p class="text-body-sm text-slate-200 break-words">{{ t.title }}</p>
                  <p class="text-caption text-slate-400 mt-0.5">Due {{ t.dueDate | date: 'MMM d' }}</p>
                </div>
                <button *ngIf="!guest" class="shrink-0 text-caption px-3 py-1.5 rounded-lg transition"
                        [disabled]="isTodoAdded(t) || addingTodo() === (t.title + '|' + t.dueDate)"
                        [ngClass]="isTodoAdded(t) ? 'text-emerald-400' : 'btn-ghost hover:text-accent-soft'"
                        (click)="addOneOffAsTodo(t)">
                  {{ isTodoAdded(t) ? '✓ Added' : (addingTodo() === (t.title + '|' + t.dueDate) ? '…' : '+ To-do') }}
                </button>
                <span *ngIf="guest" class="text-caption text-slate-400 shrink-0">{{ t.dueDate | date: 'MMM d' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Conversation with Zenamaze (owners only) — replay the discovery chat and
           keep adjusting the plan by talking to Zenamaze. Each message re-paces the
           plan above; the committed deadline stays fixed. -->
      <section *ngIf="!guest" class="mt-10 md:mt-12 animate-fade-up max-w-3xl">
        <h2 class="text-heading-lg text-white mb-1">Talk to Zenamaze</h2>
        <p class="text-body-sm text-slate-400 mb-4">Your conversation about this goal. Tell Zenamaze what changed and it'll adjust the plan above.</p>

        <!-- Gentle nudge once the plan has been reworked many times -->
        <div *ngIf="nudge() && !nudgeDismissed()" class="glass rounded-2xl p-4 mb-4 border-amber-400/30 flex items-start gap-3 animate-fade-up">
          <span class="text-lg shrink-0">💭</span>
          <div class="flex-1 min-w-0">
            <p class="text-body-sm text-slate-100">You've reworked this plan {{ g.revisionCount || 0 }} times. Planning is progress — but momentum comes from doing. Want to just start today?</p>
            <a routerLink="/dashboard" class="text-caption text-accent-soft hover:text-white inline-block mt-1.5">Start today →</a>
          </div>
          <button type="button" class="text-slate-400 hover:text-white shrink-0" (click)="nudgeDismissed.set(true)" aria-label="Dismiss">✕</button>
        </div>

        <div #chatScroll class="glass rounded-2xl p-4 md:p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div *ngIf="!g.messages?.length && !chatThinking()" class="text-center text-slate-400 text-body-sm py-6">
            No conversation yet — tell Zenamaze what changed to adjust your plan.
          </div>

          <div *ngFor="let m of g.messages"
               class="flex items-end gap-2.5"
               [class.flex-row-reverse]="m.role === 'user'">
            <div *ngIf="m.role === 'user'" class="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold select-none bg-white/10 text-slate-200 border border-white/10">
              {{ userInitial() }}
            </div>
            <img *ngIf="m.role !== 'user'" src="icon.svg" alt="" class="h-8 w-8 shrink-0 rounded-full object-cover shadow-glow">
            <div class="max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl leading-relaxed"
                 [ngClass]="m.role === 'user'
                   ? 'bg-accent text-white rounded-br-md'
                   : 'glass-strong rounded-bl-md text-slate-100 text-body-sm'">
              {{ m.text }}
            </div>
          </div>

          <div *ngIf="chatThinking()" class="flex items-end gap-2.5">
            <img src="icon.svg" alt="" class="h-8 w-8 shrink-0 rounded-full object-cover shadow-glow">
            <div class="glass-strong rounded-bl-md px-4 py-3 flex gap-1.5 items-center">
              <span class="h-2 w-2 rounded-full bg-accent-soft animate-bounce" style="animation-delay:0ms"></span>
              <span class="h-2 w-2 rounded-full bg-accent-soft animate-bounce" style="animation-delay:150ms"></span>
              <span class="h-2 w-2 rounded-full bg-accent-soft animate-bounce" style="animation-delay:300ms"></span>
            </div>
          </div>
        </div>

        <!-- Proposed plan update — shown before any change is applied -->
        <div *ngIf="pendingPlan() as pp" class="glass-strong rounded-2xl p-4 md:p-5 mt-3 border-accent/40 animate-fade-up">
          <div class="flex items-center gap-2 mb-3 flex-wrap">
            <span class="chip border-accent/30 text-accent-soft">Proposed plan update</span>
            <span class="text-caption text-slate-400">review before it's applied</span>
          </div>

          <p class="text-white font-semibold text-body-sm mb-1 break-words">{{ pp.goalRestated }}</p>
          <p *ngIf="pp.deadlineDate" class="text-caption text-slate-400 mb-3">🏁 Deadline stays {{ pp.deadlineDate | date: 'MMM d, yyyy' }}</p>

          <!-- Per-item diff: pick what to keep vs change for focus tasks + to-dos -->
          <ng-container *ngIf="revisionDiff() as diff">
            <div *ngIf="diff.focus.length" class="mb-4">
              <p class="text-micro uppercase tracking-wider text-slate-400 mb-1.5">Your commitment</p>
              <div class="space-y-2">
                <div *ngFor="let row of diff.focus" class="rounded-xl px-3 py-2 bg-white/5 border border-white/10">
                  <div class="flex items-center gap-2 text-body-sm">
                    <span class="text-accent-soft shrink-0">✦</span>
                    <span class="flex-1 min-w-0 break-words text-slate-100">{{ focusTitle(row) }}</span>
                    <span *ngIf="row.state !== 'unchanged'" class="chip shrink-0 text-micro" [ngClass]="badgeClass(row.state)">{{ badgeLabel(row.state) }}</span>
                  </div>
                  <div *ngIf="row.state !== 'unchanged'" class="mt-2 flex items-center gap-1 text-caption">
                    <button type="button" class="px-2.5 py-1 rounded-lg transition"
                      [ngClass]="choiceOf(row.key) === 'old' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'"
                      (click)="setChoice(row.key, 'old')">{{ keepLabel(row.state) }}</button>
                    <button type="button" class="px-2.5 py-1 rounded-lg transition"
                      [ngClass]="choiceOf(row.key) === 'new' ? 'bg-accent text-white' : 'text-slate-400 hover:text-white'"
                      (click)="setChoice(row.key, 'new')">{{ acceptLabel(row.state) }}</button>
                  </div>
                </div>
              </div>
            </div>

            <div *ngIf="diff.todos.length" class="mb-4">
              <p class="text-micro uppercase tracking-wider text-slate-400 mb-1.5">One-off tasks &amp; to-dos</p>
              <div class="space-y-2">
                <div *ngFor="let row of diff.todos" class="rounded-xl px-3 py-2 bg-white/5 border border-white/10">
                  <div class="flex items-center gap-2 text-body-sm">
                    <span class="text-accent-soft shrink-0">🗂</span>
                    <span class="flex-1 min-w-0 break-words text-slate-100">{{ todoTitle(row) }}</span>
                    <span *ngIf="row.state !== 'unchanged'" class="chip shrink-0 text-micro" [ngClass]="badgeClass(row.state)">{{ badgeLabel(row.state) }}</span>
                  </div>
                  <div *ngIf="row.state !== 'unchanged'" class="mt-2 flex items-center gap-1 text-caption">
                    <button type="button" class="px-2.5 py-1 rounded-lg transition"
                      [ngClass]="choiceOf(row.key) === 'old' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'"
                      (click)="setChoice(row.key, 'old')">{{ keepLabel(row.state) }}</button>
                    <button type="button" class="px-2.5 py-1 rounded-lg transition"
                      [ngClass]="choiceOf(row.key) === 'new' ? 'bg-accent text-white' : 'text-slate-400 hover:text-white'"
                      (click)="setChoice(row.key, 'new')">{{ acceptLabel(row.state) }}</button>
                  </div>
                  <label *ngIf="row.state === 'removed' && row.todo && choiceOf(row.key) === 'new'"
                         class="mt-2 flex items-center gap-2 text-caption text-slate-300 cursor-pointer">
                    <input type="checkbox" [checked]="isDeletingTodo(row.todo.todoId)"
                           (change)="toggleDeleteTodo(row.todo.todoId)" class="accent-flame">
                    Also delete "{{ row.todo.title }}" from my to-do list
                  </label>
                </div>
              </div>
            </div>
          </ng-container>

          <div class="flex flex-wrap gap-x-4 gap-y-1 text-caption text-slate-400 mb-4">
            <span *ngIf="pp.milestones?.length">🎯 {{ pp.milestones.length }} milestones</span>
            <span *ngIf="pp.checkpoints?.length">📍 {{ pp.checkpoints.length }} checkpoints</span>
          </div>

          <div class="flex gap-2 justify-end">
            <button class="btn-ghost text-caption px-4 py-2" [disabled]="applying()" (click)="discardChanges()">Discard</button>
            <button class="btn-primary text-caption px-4 py-2" [disabled]="applying()" (click)="applyChanges()">{{ applying() ? 'Applying…' : 'Apply changes' }}</button>
          </div>
        </div>

        <form (ngSubmit)="sendChat()"
              class="glass flex gap-2 items-end !rounded-3xl px-2 py-2 mt-3 focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/20 transition">
          <textarea [(ngModel)]="chatDraft" name="chatDraft" rows="1"
                    (keydown.enter)="onChatEnter($event)"
                    [disabled]="chatThinking()"
                    class="flex-1 resize-none max-h-32 bg-transparent px-3 py-2.5 text-white placeholder:text-slate-400 outline-none leading-relaxed"
                    placeholder="Tell Zenamaze what changed…"></textarea>
          <button class="h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center text-white shadow-glow transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 disabled:shadow-none"
                  style="background-image:linear-gradient(135deg,#7c5cff,#b64dff)"
                  type="submit" [disabled]="!chatDraft.trim() || chatThinking()" aria-label="Send">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 12l16-8-6 16-2-6-8-2z" fill="currentColor"/></svg>
          </button>
        </form>
        <p class="text-caption text-slate-500 mt-2">Each message drafts a plan update you can review and Apply. Your committed deadline stays fixed.</p>
      </section>

      <!-- Guest: re-open the signup gate after dismissing it -->
      <button *ngIf="guest && !gateOpen()" (click)="gateOpen.set(true)"
              class="btn-primary w-full mt-8 md:mt-10">Save this plan →</button>

      <a *ngIf="!guest" routerLink="/dashboard" class="btn-primary w-full mt-8 md:mt-10">Start today →</a>
    </div>

    <!-- Guest: prompt account only now, at save time — Pip makes the ask fun -->
    <div *ngIf="guest && gateOpen()" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-[80]"
         (click)="gateOpen.set(false)" (keydown.escape)="gateOpen.set(false)" tabindex="-1">
      <div class="glass-strong p-5 md:p-6 w-full max-w-xl animate-fade-up border-accent/25"
           role="dialog" aria-modal="true" aria-labelledby="planGateTitle" (click)="$event.stopPropagation()">
        <div class="flex items-start gap-3 mb-4">
          <app-pip [size]="48" mood="celebrate" />
          <div class="min-w-0">
            <p class="text-micro uppercase tracking-wider text-accent-soft mb-0.5">{{ pip.name }}</p>
            <p id="planGateTitle" class="text-white font-bold text-heading leading-snug">{{ pip.planGate.title }}</p>
          </div>
        </div>
        <p class="text-body-sm text-slate-300 mb-4 leading-relaxed">{{ pip.planGate.body }}</p>
        <a [routerLink]="['/login']" [queryParams]="{ claim: goalId }" class="btn-primary w-full">
          Create free account & save →
        </a>
        <button type="button" (click)="gateOpen.set(false)"
                class="text-caption text-slate-400 hover:text-white mt-3 mx-auto block">Keep looking at my plan</button>
        <p class="text-caption text-slate-600 mt-2 text-center">Your plan is already generated — signup just keeps it.</p>
      </div>
    </div>

    <!-- Unsaved-changes action bar (owners only) -->
    <div *ngIf="!guest && dirty()"
         class="fixed left-1/2 -translate-x-1/2 bottom-28 md:bottom-8 z-[65] w-[92%] max-w-md animate-pop">
      <div class="glass-strong px-4 py-3 rounded-2xl flex items-center gap-3 border-accent/30">
        <span class="text-body-sm text-slate-200 flex-1">Unsaved schedule changes</span>
        <button class="btn-ghost text-caption px-3 py-1.5" [disabled]="saving()" (click)="discard()">Discard</button>
        <button class="btn-primary text-caption px-4 py-1.5" [disabled]="saving()" (click)="save()">
          {{ saving() ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </div>

    <!-- Leave confirmation (fired by the route guard) -->
    <div *ngIf="leaveOpen()" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-[80]"
         (click)="leaveStay()" (keydown.escape)="leaveStay()" tabindex="-1">
      <div class="glass-strong p-6 w-full max-w-sm animate-fade-up text-center"
           role="dialog" aria-modal="true" aria-labelledby="leaveTitle" (click)="$event.stopPropagation()">
        <p class="text-2xl mb-2">⚠️</p>
        <h3 id="leaveTitle" class="text-heading text-white mb-1">Save your changes?</h3>
        <p class="text-body-sm text-slate-400 mb-5">You have unsaved schedule changes. Leaving now will lose them.</p>
        <div class="flex flex-col gap-2">
          <button class="btn-primary w-full" [disabled]="saving()" (click)="leaveSave()">{{ saving() ? 'Saving…' : 'Save & leave' }}</button>
          <button class="btn-ghost w-full" [disabled]="saving()" (click)="leaveDiscard()">Leave without saving</button>
          <button class="text-caption text-slate-400 hover:text-white mt-1" [disabled]="saving()" (click)="leaveStay()">Stay on this page</button>
        </div>
      </div>
    </div>

    <!-- Confirm cascade-deletion of real to-dos before applying the revision -->
    <div *ngIf="confirmDeleteTodos() as dels" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-[80]"
         (click)="confirmDeleteTodos.set(null)" (keydown.escape)="confirmDeleteTodos.set(null)" tabindex="-1">
      <div class="glass-strong p-6 w-full max-w-sm animate-fade-up"
           role="dialog" aria-modal="true" aria-labelledby="delTodosTitle" (click)="$event.stopPropagation()">
        <p class="text-2xl mb-2 text-center">🗑️</p>
        <h3 id="delTodosTitle" class="text-heading text-white mb-1 text-center">Also delete {{ dels.length }} to-do{{ dels.length === 1 ? '' : 's' }}?</h3>
        <p class="text-body-sm text-slate-400 mb-4 text-center">These will be removed from your to-do list too:</p>
        <ul class="space-y-1.5 mb-5 max-h-40 overflow-y-auto">
          <li *ngFor="let t of dels" class="text-body-sm text-slate-200 flex items-center gap-2">
            <span class="text-flame shrink-0">•</span>
            <span class="flex-1 min-w-0 break-words">{{ t.title }}</span>
          </li>
        </ul>
        <div class="flex flex-col gap-2">
          <button class="btn-primary w-full" [disabled]="applying()" (click)="proceedApply()">{{ applying() ? 'Applying…' : 'Delete & apply' }}</button>
          <button class="btn-ghost w-full" [disabled]="applying()" (click)="confirmDeleteTodos.set(null)">Cancel</button>
        </div>
      </div>
    </div>

    <div *ngIf="toast() as m" class="fixed bottom-28 md:bottom-8 left-1/2 -translate-x-1/2 z-[70] glass-strong px-4 py-2.5 rounded-full text-body-sm text-white animate-pop">
      {{ m }}
    </div>

    <app-bottom-nav *ngIf="!guest && goal()"></app-bottom-nav>

    <div *ngIf="!goal() && !error()" class="min-h-screen flex items-center justify-center">
      <div class="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin"></div>
    </div>
    <div *ngIf="error()" class="min-h-screen flex items-center justify-center text-slate-400">
      Couldn’t load this goal. <a routerLink="/dashboard" class="text-accent-soft ml-1">Back</a>
    </div>
  `,
})
export class PlanComponent implements OnInit, CanComponentDeactivate {
  goal = signal<Goal | null>(null);
  error = signal(false);
  guest = false;
  goalId = '';

  // Edits are buffered locally and only persisted when the user hits Save.
  // Keyed by focusId; a field only stays in the map while it differs from the
  // saved value, so `dirty` is exact and a revert clears it.
  private edits = signal<Record<string, FocusPatch>>({});
  dirty = computed(() => Object.keys(this.edits()).length > 0);
  saving = signal(false);
  toast = signal<string | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  // Leave-confirmation dialog (shown by the route guard when navigating away
  // with unsaved edits).
  leaveOpen = signal(false);
  private leaveResolver?: (leave: boolean) => void;

  // Mon-first display; values are 0-6 (Sun..Sat) to match the server.
  weekDays = [
    { value: 1, label: 'M' },
    { value: 2, label: 'T' },
    { value: 3, label: 'W' },
    { value: 4, label: 'T' },
    { value: 5, label: 'F' },
    { value: 6, label: 'S' },
    { value: 0, label: 'S' },
  ];

  // --- Talk-to-Zenamaze conversation (owners only) ---
  @ViewChild('chatScroll') chatScrollEl?: ElementRef<HTMLDivElement>;
  chatDraft = '';
  chatThinking = signal(false);
  userInitial = computed(() => {
    const n = this.auth.user()?.name?.trim();
    return n ? n[0].toUpperCase() : 'Y';
  });

  // Preview-before-apply: the proposed plan sits here until the user commits it.
  pendingPlan = signal<Plan | null>(null);
  applying = signal(false);

  // This goal's real to-dos (owners only) — used to link dropped plan one-offs to
  // actual to-dos so they can be cascade-deleted on apply.
  goalTodos = signal<Todo[]>([]);
  // Per-row keep/replace choice for the revision diff, keyed by diff-row key.
  // A missing key defaults to 'new' (accept the proposal) — so an untouched Apply
  // reproduces the old wholesale behaviour.
  private choice = signal<Record<string, 'new' | 'old'>>({});
  // Real to-dos the user ticked to also delete (opt-in).
  private deleteTodoIds = signal<Set<string>>(new Set());
  // To-dos pending confirmation in the cascade-delete modal.
  confirmDeleteTodos = signal<Todo[] | null>(null);
  // Guest signup gate — shown as a modal for guests.
  gateOpen = signal(true);
  // "You're planning, not doing" nudge.
  nudge = signal(false);
  nudgeDismissed = signal(false);

  // Per-item diff of the proposed plan vs the live plan (focus tasks + to-dos).
  revisionDiff = computed<RevisionDiff | null>(() => {
    const pp = this.pendingPlan();
    if (!pp) return null;
    return buildRevisionDiff(this.goal()?.plan ?? null, pp, this.goalTodos());
  });

  choiceOf(key: string): 'new' | 'old' {
    return this.choice()[key] ?? 'new';
  }
  setChoice(key: string, val: 'new' | 'old'): void {
    this.choice.update((m) => ({ ...m, [key]: val }));
  }
  isDeletingTodo(todoId: string): boolean {
    return this.deleteTodoIds().has(todoId);
  }
  toggleDeleteTodo(todoId: string): void {
    this.deleteTodoIds.update((s) => {
      const next = new Set(s);
      next.has(todoId) ? next.delete(todoId) : next.add(todoId);
      return next;
    });
  }

  // Title to show for a diff row given the current keep/replace choice.
  focusTitle(row: RevisionDiff['focus'][number]): string {
    if (this.choiceOf(row.key) === 'old' && row.old) return row.old.title;
    return row.proposed?.title ?? row.old?.title ?? '';
  }
  todoTitle(row: RevisionDiff['todos'][number]): string {
    if (this.choiceOf(row.key) === 'old' && row.old) return row.old.title;
    return row.proposed?.title ?? row.old?.title ?? '';
  }

  badgeLabel(state: RevisionDiffState): string {
    return state === 'added' ? 'New' : state === 'removed' ? 'Removed' : 'Changed';
  }
  badgeClass(state: RevisionDiffState): string {
    return state === 'added'
      ? 'border-emerald-400/30 text-emerald-300'
      : state === 'removed'
      ? 'border-flame/40 text-flame'
      : 'border-amber-400/30 text-amber-300';
  }
  keepLabel(state: RevisionDiffState): string {
    return state === 'added' ? 'Skip' : state === 'removed' ? 'Keep it' : 'Keep current';
  }
  acceptLabel(state: RevisionDiffState): string {
    return state === 'added' ? 'Add' : state === 'removed' ? 'Remove' : 'Use new';
  }

  // Assemble the final plan the user committed to, from the preview + per-row
  // choices. Everything but focus tasks / one-offs is taken wholesale from the
  // proposal; the server re-normalizes, so this need not be canonical.
  private buildMergedPlan(): Plan | null {
    const pp = this.pendingPlan();
    const diff = this.revisionDiff();
    if (!pp || !diff) return null;
    const recurringTasks: RecurringTask[] = [];
    for (const row of diff.focus) {
      const pick = this.choiceOf(row.key);
      if (row.state === 'unchanged') { if (row.proposed) recurringTasks.push(row.proposed); }
      else if (row.state === 'added') { if (pick === 'new' && row.proposed) recurringTasks.push(row.proposed); }
      else if (row.state === 'removed') { if (pick === 'old' && row.old) recurringTasks.push(row.old); }
      else if (pick === 'new' && row.proposed) recurringTasks.push(row.proposed);
      else if (row.old) recurringTasks.push(row.old);
    }
    const oneOffTasks: OneOffTask[] = [];
    for (const row of diff.todos) {
      const pick = this.choiceOf(row.key);
      if (row.state === 'unchanged') { if (row.proposed) oneOffTasks.push(row.proposed); }
      else if (row.state === 'added') { if (pick === 'new' && row.proposed) oneOffTasks.push(row.proposed); }
      else if (row.state === 'removed') { if (pick === 'old' && row.old) oneOffTasks.push(row.old); }
      else if (pick === 'new' && row.proposed) oneOffTasks.push(row.proposed);
      else if (row.old) oneOffTasks.push(row.old);
    }
    return { ...pp, recurringTasks, oneOffTasks };
  }

  // The to-do ids to actually cascade-delete: only removed rows the user accepted
  // (choice 'new') AND ticked for deletion.
  private mergedDeleteTodoIds(): string[] {
    const diff = this.revisionDiff();
    if (!diff) return [];
    const ticked = this.deleteTodoIds();
    return diff.todos
      .filter((r) => r.state === 'removed' && !!r.todo && this.choiceOf(r.key) === 'new' && ticked.has(r.todo.todoId))
      .map((r) => r.todo!.todoId);
  }

  // Feature: turn a plan one-off task into a dated to-do. Track which have been
  // added (by title|date) so buttons flip to "Added" and don't double-create.
  addedTodos = signal<Set<string>>(new Set());
  addingTodo = signal<string | null>(null);
  private oneOffKey(t: OneOffTask): string {
    return `${t.title}|${t.dueDate}`;
  }
  isTodoAdded(t: OneOffTask): boolean {
    return this.addedTodos().has(this.oneOffKey(t));
  }
  addOneOffAsTodo(t: OneOffTask): void {
    const g = this.goal();
    const key = this.oneOffKey(t);
    if (!g || this.isTodoAdded(t) || this.addingTodo()) return;
    this.addingTodo.set(key);
    this.api.createTodo({ title: t.title, goalId: g.goalId, schedule: 'date', dueDate: t.dueDate }).subscribe({
      next: () => {
        this.addedTodos.update((s) => new Set(s).add(key));
        this.addingTodo.set(null);
        this.showToast('Added to your to-dos');
      },
      error: () => { this.addingTodo.set(null); this.showToast('Could not add — try again'); },
    });
  }
  addAllOneOffAsTodos(): void {
    const g = this.goal();
    const tasks = g?.plan?.oneOffTasks || [];
    for (const t of tasks) if (!this.isTodoAdded(t)) this.addOneOffAsTodo(t);
  }
  // Compact cadence label for a proposed recurring task in the preview card.
  cadenceOf(t: RecurringTask): string {
    const d = this.normDays(t.daysOfWeek);
    return d ? `${d.length}× / week` : 'Every day';
  }

  pip = PIP;

  constructor(private api: ApiService, private auth: AuthService, private route: ActivatedRoute, private router: Router, private onboarding: OnboardingService) {}

  onChatEnter(e: Event): void {
    const ke = e as KeyboardEvent;
    if (!ke.shiftKey) {
      e.preventDefault();
      this.sendChat();
    }
  }

  // Send a message to Zenamaze: optimistically show it, then PREVIEW the revised
  // plan (nothing is applied yet). The proposal renders in a card the user can
  // Apply or Discard — so they always see the updated plan before it changes.
  sendChat(): void {
    const g = this.goal();
    const text = this.chatDraft.trim();
    if (!g || !text || this.chatThinking()) return;
    const optimistic: ChatMessage = { role: 'user', text };
    this.goal.set({ ...g, messages: [...(g.messages || []), optimistic] });
    this.chatDraft = '';
    this.chatThinking.set(true);
    this.pendingPlan.set(null);
    this.choice.set({});
    this.deleteTodoIds.set(new Set());
    setTimeout(() => this.scrollChat());

    this.api.previewRevision(g.goalId, text).subscribe({
      next: (r) => {
        this.chatThinking.set(false);
        const cur = this.goal();
        if (!cur) return;
        this.pendingPlan.set(r.plan);
        this.goal.set({
          ...cur,
          messages: [...(cur.messages || []), { role: 'assistant', text: "Here's how I'd adjust your plan — review it below, then Apply if it looks right." }],
        });
        setTimeout(() => this.scrollChat());
      },
      error: () => {
        this.chatThinking.set(false);
        const cur = this.goal();
        if (cur) {
          this.goal.set({
            ...cur,
            messages: [...(cur.messages || []), { role: 'assistant', text: 'Hmm, I couldn’t draft that change just now. Try again in a moment?' }],
          });
        }
        setTimeout(() => this.scrollChat());
      },
    });
  }

  // Commit the previewed plan built from the user's per-item choices. If any real
  // to-dos are set to cascade-delete, confirm first; otherwise apply directly.
  applyChanges(): void {
    if (!this.pendingPlan() || this.applying()) return;
    const delIds = this.mergedDeleteTodoIds();
    if (delIds.length) {
      const diff = this.revisionDiff();
      const todos = (diff?.todos || [])
        .filter((r) => r.todo && delIds.includes(r.todo.todoId))
        .map((r) => r.todo!);
      this.confirmDeleteTodos.set(todos);
      return;
    }
    this.proceedApply();
  }

  // Persist the merged plan + cascade-delete confirmed to-dos, record both turns.
  proceedApply(): void {
    const g = this.goal();
    const merged = this.buildMergedPlan();
    if (!g || !merged || this.applying()) return;
    const delIds = this.mergedDeleteTodoIds();
    this.applying.set(true);
    this.api.applyRevision(g.goalId, merged, delIds).subscribe({
      next: (r) => {
        this.applying.set(false);
        this.confirmDeleteTodos.set(null);
        const cur = this.goal();
        if (cur) this.goal.set({ ...cur, plan: r.plan, messages: r.messages ?? cur.messages, pendingRevision: null, revisionCount: r.revisionCount ?? cur.revisionCount });
        if (delIds.length) this.goalTodos.update((list) => list.filter((t) => !delIds.includes(t.todoId)));
        this.pendingPlan.set(null);
        this.choice.set({});
        this.deleteTodoIds.set(new Set());
        if (typeof r.nudge === 'boolean') this.nudge.set(r.nudge);
        this.showToast('Plan updated');
        setTimeout(() => this.scrollChat());
      },
      error: () => { this.applying.set(false); this.confirmDeleteTodos.set(null); this.showToast('Could not apply — try again'); },
    });
  }

  // Throw the proposed change away; the live plan is untouched.
  discardChanges(): void {
    const g = this.goal();
    if (!g) return;
    this.pendingPlan.set(null);
    this.choice.set({});
    this.deleteTodoIds.set(new Set());
    const cur = this.goal();
    if (cur) this.goal.set({ ...cur, pendingRevision: null, messages: [...(cur.messages || []), { role: 'assistant', text: 'No changes made — your plan stays as it is. Tell me if you want something different.' }] });
    this.api.discardRevision(g.goalId).subscribe({ next: () => {}, error: () => {} });
    setTimeout(() => this.scrollChat());
  }

  private scrollChat(): void {
    const el = this.chatScrollEl?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  // Stable key the edit endpoint accepts (id, else title).
  focusId(t: RecurringTask): string {
    return t.id || t.title;
  }

  // Canonical days for a stored value: null/empty/all-7 => null ("every day").
  private normDays(d: number[] | null | undefined): number[] | null {
    if (!Array.isArray(d) || d.length === 0 || d.length >= 7) return null;
    return [...d].sort((a, b) => a - b);
  }

  private sameDays(a: number[] | null, b: number[] | null): boolean {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }

  // Effective (edit-aware) values used everywhere in the template.
  private effDays(t: RecurringTask): number[] | null {
    const e = this.edits()[this.focusId(t)];
    return this.normDays(e && 'daysOfWeek' in e ? e.daysOfWeek : t.daysOfWeek);
  }
  private effPaused(t: RecurringTask): string | null {
    const e = this.edits()[this.focusId(t)];
    return (e && 'pausedUntil' in e ? e.pausedUntil : t.pausedUntil) || null;
  }
  pausedDate(t: RecurringTask): string | null {
    return this.effPaused(t);
  }

  private selectedDays(t: RecurringTask): number[] {
    return this.effDays(t) ?? [0, 1, 2, 3, 4, 5, 6];
  }

  isDaySelected(t: RecurringTask, day: number): boolean {
    return this.selectedDays(t).includes(day);
  }

  countLabel(t: RecurringTask): string {
    const d = this.effDays(t);
    return d ? `${d.length}× / week` : 'Every day';
  }

  isPaused(t: RecurringTask): boolean {
    const p = this.effPaused(t);
    return !!p && p >= this.todayStr();
  }

  // Buffer one field's change, dropping it if it matches the saved value.
  private setEdit(t: RecurringTask, patch: FocusPatch): void {
    const fid = this.focusId(t);
    const map = { ...this.edits() };
    const cur: FocusPatch = { ...(map[fid] || {}), ...patch };
    const merged: FocusPatch = {};
    if ('daysOfWeek' in cur && !this.sameDays(this.normDays(cur.daysOfWeek), this.normDays(t.daysOfWeek))) {
      merged.daysOfWeek = this.normDays(cur.daysOfWeek);
    }
    if ('pausedUntil' in cur && (cur.pausedUntil || null) !== (t.pausedUntil || null)) {
      merged.pausedUntil = cur.pausedUntil || null;
    }
    if (Object.keys(merged).length === 0) delete map[fid];
    else map[fid] = merged;
    this.edits.set(map);
  }

  toggleDay(t: RecurringTask, day: number): void {
    const cur = new Set(this.selectedDays(t));
    if (cur.has(day)) {
      if (cur.size <= 1) return; // keep at least one day
      cur.delete(day);
    } else {
      cur.add(day);
    }
    const next = [...cur].sort((a, b) => a - b);
    this.setEdit(t, { daysOfWeek: next.length >= 7 ? null : next });
  }

  pausePreset(t: RecurringTask, days: number): void {
    this.setEdit(t, { pausedUntil: this.addDays(days) });
  }

  pauseMonths(t: RecurringTask, months: number): void {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    this.setEdit(t, { pausedUntil: this.fmt(d) });
  }

  pauseUntil(t: RecurringTask, ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    if (v) this.setEdit(t, { pausedUntil: v });
  }

  resume(t: RecurringTask): void {
    this.setEdit(t, { pausedUntil: null });
  }

  // Persist all buffered edits, one goal-write at a time (sequential so the
  // whole-plan writes don't clobber each other). Returns success.
  async save(): Promise<boolean> {
    const g = this.goal();
    if (!g || this.saving() || !this.dirty()) return true;
    this.saving.set(true);
    const entries = Object.entries(this.edits());
    let plan = g.plan;
    try {
      for (const [fid, patch] of entries) {
        const res = await firstValueFrom(this.api.updateFocus(g.goalId, fid, patch));
        plan = res.plan;
      }
      this.goal.set({ ...g, plan: plan! });
      this.edits.set({});
      this.saving.set(false);
      this.showToast('Changes saved');
      return true;
    } catch {
      this.saving.set(false);
      this.showToast('Could not save — try again');
      return false;
    }
  }

  discard(): void {
    this.edits.set({});
    this.showToast('Changes discarded');
  }

  // --- Unsaved-changes navigation guard --------------------------------------
  canDeactivate(): boolean | Promise<boolean> {
    if (!this.dirty()) return true;
    this.leaveOpen.set(true);
    return new Promise<boolean>((resolve) => (this.leaveResolver = resolve));
  }

  private resolveLeave(leave: boolean): void {
    this.leaveOpen.set(false);
    const r = this.leaveResolver;
    this.leaveResolver = undefined;
    if (r) r(leave);
  }

  leaveStay(): void {
    this.resolveLeave(false);
  }
  leaveDiscard(): void {
    this.edits.set({});
    this.resolveLeave(true);
  }
  async leaveSave(): Promise<void> {
    const ok = await this.save();
    this.resolveLeave(ok); // on failure, keep them on the page
  }

  // Warn on full page unload / tab close / hard reload too.
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(e: BeforeUnloadEvent): void {
    if (this.dirty()) {
      e.preventDefault();
      e.returnValue = '';
    }
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 2200);
  }

  // Local-date helpers (avoid UTC drift from toISOString).
  private fmt(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  private addDays(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return this.fmt(d);
  }
  todayStr(): string {
    return this.fmt(new Date());
  }
  tomorrowStr(): string {
    return this.addDays(1);
  }

  ngOnInit(): void {
    this.goalId = this.route.snapshot.paramMap.get('id') || '';
    this.guest = !!this.route.snapshot.data['guest'];
    const load = this.guest ? this.api.guestGetGoal(this.goalId) : this.api.getGoal(this.goalId);
    load.subscribe({
      next: (g) => {
        // A guest goal still mid-discovery: send them back into the chat.
        if (this.guest && g.phase !== 'done') {
          this.router.navigate(['/try', this.goalId]);
          return;
        }
        this.goal.set(g);
        // Guest reached a finished plan → the real "aha". Log it (funnel) and mark
        // the guided run at the sign-up gate.
        if (this.guest) { this.onboarding.markPlanReveal(); this.onboarding.markPlanReady(); }
        // Restore an unfinished plan preview (owners only) so it survives a reload.
        if (!this.guest && g.pendingRevision?.plan) this.pendingPlan.set(g.pendingRevision.plan);
        // Owners: load this goal's to-dos (for cascade-delete linkage) and set the
        // "planning, not doing" nudge from how often the plan has been reworked.
        if (!this.guest) {
          this.nudge.set((g.revisionCount || 0) >= REVISION_NUDGE_THRESHOLD);
          this.api.listTodos('open').subscribe({
            next: (r) => this.goalTodos.set((r.todos || []).filter((t) => t.goalId === this.goalId)),
            error: () => {},
          });
        }
      },
      error: () => this.error.set(true),
    });
  }
}
