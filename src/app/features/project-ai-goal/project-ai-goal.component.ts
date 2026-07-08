import { Component, ElementRef, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ChatMessage, GoalSummaryPreview, Plan, ProjectPlanRevisionPreview, TurnResponse } from '../../core/models';

// Shared AI discovery chat for a TEAM goal. Same create→message→confirm flow as
// the solo onboarding, scoped to a project. On confirm the backend generates the
// plan AND materializes its milestones/tasks as shared project tasks, so the
// whole team sees the goal + progress. Route: /project/:id/ai-goal/:goalId
// (goalId 'new' starts a fresh interview).
@Component({
  selector: 'app-project-ai-goal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="flex flex-col max-w-2xl md:max-w-3xl mx-auto w-full px-4 md:px-6" style="height:100vh;height:100dvh">
      <header class="pt-4 md:pt-6 pb-3 sticky top-0 bg-ink-950/80 backdrop-blur z-10">
        <div class="flex items-center gap-3 mb-2">
          <a [routerLink]="['/project', projectId]" class="h-9 w-9 -ml-1 shrink-0 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/5" aria-label="Back to project">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
          <img src="icon.svg" alt="" class="h-7 w-7 rounded-lg shadow-glow object-cover">
          <span class="text-heading text-white flex-1">Team goal · Zenamaze</span>
          @if (phase() !== 'done' && progress() > 0) { <span class="text-xs text-slate-400 shrink-0">{{ progress() }}% clear</span> }
        </div>
        <div class="h-1.5 rounded-full bg-ink-800 overflow-hidden">
          <div class="h-full bg-accent transition-all duration-700 ease-out" [style.width.%]="phase() === 'done' ? 100 : progress()"></div>
        </div>
      </header>

      <div #scroll class="flex-1 overflow-y-auto py-4 space-y-5">
        @for (m of messages(); track $index) {
          <div class="animate-fade-up flex items-end gap-2.5" [class.flex-row-reverse]="m.role === 'user'">
            @if (m.role === 'user') {
              <div class="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold bg-white/10 text-slate-200 border border-white/10">You</div>
            } @else {
              <img src="icon.svg" alt="" class="h-8 w-8 shrink-0 rounded-full object-cover shadow-glow">
            }
            <div class="max-w-[80%] rounded-2xl px-4 py-2.5 text-body-sm whitespace-pre-wrap"
                 [ngClass]="m.role === 'user' ? 'bg-accent text-white rounded-br-sm' : 'glass text-slate-100 rounded-bl-sm'">{{ m.text }}</div>
          </div>
        }

        @if (thinking()) {
          <div class="flex items-end gap-2.5">
            <img src="icon.svg" alt="" class="h-8 w-8 rounded-full object-cover shadow-glow">
            <div class="glass rounded-2xl rounded-bl-sm px-4 py-3"><div class="flex gap-1"><span class="h-2 w-2 rounded-full bg-slate-400 animate-bounce"></span><span class="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style="animation-delay:.15s"></span><span class="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style="animation-delay:.3s"></span></div></div>
          </div>
        }

        <!-- Summary confirmation card -->
        @if (summary(); as s) {
          <div class="glass-strong rounded-2xl p-4 animate-fade-up">
            <h3 class="text-white font-bold mb-2">Here's the plan we'll build for the team</h3>
            <p class="text-body-sm text-slate-200 mb-3">{{ s.understanding }}</p>
            @if (s.dailyCommitment) { <p class="text-caption text-accent-soft mb-2">🎯 Keystone: {{ s.dailyCommitment }}</p> }
            @if (s.breakdown.length) {
              <ul class="text-body-sm text-slate-300 space-y-1 mb-3">
                @for (b of s.breakdown; track b) { <li class="flex gap-2"><span class="text-accent-soft">→</span>{{ b }}</li> }
              </ul>
            }
            @if (s.deadlineDate) { <p class="text-caption text-slate-400 mb-3">Target: {{ s.deadlineDate }}</p> }
            <div class="flex gap-2">
              <button class="btn-primary text-sm !py-2 flex-1" (click)="confirm()" [disabled]="confirming()">{{ confirming() ? 'Building plan…' : 'Build the plan' }}</button>
            </div>
            <p class="text-caption text-slate-500 mt-2">Or type below to refine it further.</p>
          </div>
        }

        <!-- Reusable plan body: every process/task the plan creates -->
        <ng-template #planBody let-p>
          @if (p.deadlineDate) { <p class="text-caption text-slate-400 mb-2">🎯 Target date: {{ p.deadlineDate }}</p> }
          @if (p.recurringTasks?.length) {
            <p class="text-micro uppercase tracking-wider text-slate-400 mb-1">Daily / weekly processes</p>
            <ul class="text-body-sm text-slate-300 space-y-1 mb-3">
              @for (r of p.recurringTasks; track r.title) {
                <li class="flex justify-between gap-2">
                  <span>{{ r.title }} <span class="text-caption text-slate-500">· {{ r.estMinutes }}m</span></span>
                  @if (r.activatesOn) { <span class="text-caption text-gold shrink-0">🔒 starts {{ r.activatesOn }}</span> }
                </li>
              }
            </ul>
          }
          @if (p.milestones?.length) {
            <p class="text-micro uppercase tracking-wider text-slate-400 mb-1">Milestones</p>
            <ul class="text-body-sm text-slate-300 space-y-1 mb-3">
              @for (m of p.milestones; track m.title) { <li class="flex justify-between gap-2"><span>{{ m.title }}</span><span class="text-caption text-slate-500 shrink-0">{{ m.targetDate }}</span></li> }
            </ul>
          }
          @if (p.oneOffTasks?.length) {
            <p class="text-micro uppercase tracking-wider text-slate-400 mb-1">One-off tasks</p>
            <ul class="text-body-sm text-slate-300 space-y-1 mb-3">
              @for (o of p.oneOffTasks; track o.title) { <li class="flex justify-between gap-2"><span>{{ o.title }}</span><span class="text-caption text-slate-500 shrink-0">{{ o.dueDate }}</span></li> }
            </ul>
          }
          @if (p.checkpoints?.length) {
            <p class="text-micro uppercase tracking-wider text-slate-400 mb-1">Checkpoints</p>
            <ul class="text-body-sm text-slate-300 space-y-1 mb-3">
              @for (c of p.checkpoints; track c.date) { <li class="flex gap-2"><span class="text-caption text-slate-500 shrink-0">{{ c.date }}</span><span>{{ c.target }}</span></li> }
            </ul>
          }
        </ng-template>

        <!-- Final plan -->
        @if (plan(); as p) {
          <div class="glass-strong rounded-2xl p-4 animate-fade-up">
            <h3 class="text-white font-bold mb-1">✅ Plan ready — tasks added for the team</h3>
            <p class="text-body-sm text-slate-200 mb-3">{{ p.goalRestated }}</p>
            <ng-container *ngTemplateOutlet="planBody; context: { $implicit: p }"></ng-container>
            <a [routerLink]="['/project', projectId]" class="btn-primary text-sm !py-2 block text-center mb-2">See it on the project board</a>

            @if (!refineOpen()) {
              <button class="text-caption text-accent-soft hover:text-white w-full text-center" (click)="openRefine()">✨ Refine this plan</button>
            } @else {
              <div class="mt-3 pt-3 border-t border-white/5">
                <div class="flex items-center justify-between mb-2">
                  <h4 class="text-white font-bold">Refine with Zenamaze</h4>
                  <button class="text-caption text-slate-400 hover:text-white" (click)="closeRefine()" [disabled]="refineApplying()">Close</button>
                </div>

                <!-- Chat: ask questions or say what to change; Zenamaze replies each turn -->
                @if (refineMessages().length || refinePreviewing()) {
                  <div class="space-y-2 mb-3">
                    @for (m of refineMessages(); track $index) {
                      <div class="flex" [class.justify-end]="m.role === 'user'">
                        <div class="max-w-[85%] rounded-2xl px-3 py-2 text-body-sm whitespace-pre-wrap" [ngClass]="m.role === 'user' ? 'bg-accent text-white rounded-br-sm' : 'glass text-slate-100 rounded-bl-sm'">{{ m.text }}</div>
                      </div>
                    }
                    @if (refinePreviewing()) {
                      <div class="flex"><div class="glass rounded-2xl rounded-bl-sm px-3 py-2"><div class="flex gap-1"><span class="h-2 w-2 rounded-full bg-slate-400 animate-bounce"></span><span class="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style="animation-delay:.15s"></span><span class="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style="animation-delay:.3s"></span></div></div></div>
                    }
                  </div>
                } @else {
                  <p class="text-caption text-slate-400 mb-2">Ask a question or say what to change. Zenamaze replies, and you can go back and forth — then lock it in. Set a new target date to move the deadline.</p>
                }

                <!-- Latest proposed plan (updates every turn; nothing changes until you lock it) -->
                @if (refinePreview(); as rp) {
                  <div class="glass rounded-xl p-3 mb-3">
                    <p class="text-micro uppercase tracking-wider text-slate-400 mb-1">Proposed plan (not applied yet)</p>
                    <p class="text-body-sm text-slate-200 mb-2">{{ rp.plan.goalRestated }}</p>
                    <ng-container *ngTemplateOutlet="planBody; context: { $implicit: rp.plan }"></ng-container>
                    @if (rp.diff.length) {
                      <p class="text-micro uppercase tracking-wider text-slate-400 mb-1">Changes</p>
                      <div class="space-y-1.5 max-h-40 overflow-y-auto">
                        @for (d of rp.diff; track d.title) {
                          <div class="flex items-center gap-2 text-body-sm">
                            <span class="chip !py-0.5 !px-2 text-micro shrink-0" [ngClass]="{ 'text-accent-soft border-accent/30': d.state === 'added', 'text-flame border-flame/40': d.state === 'removed', 'text-gold border-gold/30': d.state === 'changed' }">{{ d.state }}</span>
                            <span class="text-slate-200 truncate">{{ d.title }}</span>
                          </div>
                        }
                      </div>
                    } @else { <p class="text-caption text-slate-500">Only pacing/wording changed.</p> }
                  </div>
                }

                @if (refineError()) { <p class="text-flame text-caption mb-2">{{ refineError() }}</p> }

                <!-- Composer -->
                <textarea class="input w-full resize-none" rows="2" [(ngModel)]="refineText" (keydown.enter)="$event.preventDefault(); sendRefine()" placeholder="e.g. What's a lead magnet? I have no doctors on LinkedIn." [disabled]="refinePreviewing()"></textarea>
                <label class="text-caption text-slate-400 block mt-1">New target date (optional)
                  <input type="date" class="input w-full mt-1" [(ngModel)]="refineDeadline" [disabled]="refinePreviewing()" />
                </label>
                <div class="flex gap-2 mt-2">
                  <button class="btn-ghost text-sm !py-2" [class.flex-1]="!refinePreview()" (click)="sendRefine()" [disabled]="refinePreviewing() || (!refineText.trim() && !refineDeadline)">{{ refinePreviewing() ? 'Thinking…' : (refinePreview() ? 'Send' : 'Ask / preview') }}</button>
                  @if (refinePreview()) {
                    <button class="btn-primary text-sm !py-2 flex-1" (click)="applyRefine()" [disabled]="refineApplying() || refinePreviewing()">{{ refineApplying() ? 'Locking…' : 'Apply revision (lock)' }}</button>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>

      @if (phase() !== 'done') {
        <div class="pb-4 pt-2 sticky bottom-0 bg-ink-950/80 backdrop-blur">
          @if (loadError()) { <p class="text-flame text-caption mb-2">{{ loadError() }}</p> }
          <div class="flex gap-2 items-end">
            <textarea #input class="input flex-1 resize-none" rows="1" [(ngModel)]="draft" (keydown.enter)="$event.preventDefault(); send()" placeholder="Type your answer…" [disabled]="starting()"></textarea>
            <button class="btn-primary !py-2.5 shrink-0" (click)="send()" [disabled]="thinking() || starting() || !draft.trim()">Send</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class ProjectAiGoalComponent implements OnInit {
  @ViewChild('scroll') scrollEl?: ElementRef<HTMLDivElement>;

  projectId = '';
  goalId = signal<string>('');
  messages = signal<ChatMessage[]>([]);
  phase = signal<string>('discovery');
  progress = signal<number>(0);
  summary = signal<GoalSummaryPreview | null>(null);
  plan = signal<Plan | null>(null);

  // Inline "refine the plan" flow, available once the plan is built — so the
  // user can adjust it right here instead of hunting on the board. The button is
  // shown to everyone; the backend enforces owner/admin and returns a clear
  // error otherwise (surfaced in refineError).
  refineOpen = signal(false);
  refineText = '';
  refineDeadline = '';
  refineMessages = signal<ChatMessage[]>([]);
  refinePreview = signal<ProjectPlanRevisionPreview | null>(null);
  refinePreviewing = signal(false);
  refineApplying = signal(false);
  refineError = signal<string | null>(null);

  draft = '';
  starting = signal(true);
  thinking = signal(false);
  confirming = signal(false);
  loadError = signal<string | null>(null);

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') || '';
    const gid = this.route.snapshot.paramMap.get('goalId') || 'new';
    if (gid === 'new') {
      this.startNew();
    } else {
      this.goalId.set(gid);
      this.resume(gid);
    }
  }

  private startNew() {
    this.starting.set(true);
    this.api.createProjectAiGoal(this.projectId).subscribe({
      next: (r) => {
        this.goalId.set(r.projectGoalId);
        this.phase.set(r.phase);
        this.messages.set([{ role: 'assistant', text: r.message }]);
        this.starting.set(false);
        // Reflect the real id in the URL so a reload resumes.
        this.router.navigate(['/project', this.projectId, 'ai-goal', r.projectGoalId], { replaceUrl: true });
        this.scrollDown();
      },
      error: (e) => { this.starting.set(false); this.loadError.set(e?.error?.message || 'Could not start. You may not have permission to create goals here.'); },
    });
  }

  private resume(gid: string) {
    this.starting.set(true);
    this.api.getProjectAiGoal(this.projectId, gid).subscribe({
      next: (g) => {
        this.phase.set(g.phase || 'discovery');
        this.messages.set(g.messages || []);
        this.summary.set(g.phase === 'summary' ? (g.summary || null) : null);
        this.plan.set(g.phase === 'done' ? (g.plan || null) : null);
        this.starting.set(false);
        this.scrollDown();
      },
      error: (e) => { this.starting.set(false); this.loadError.set(e?.error?.message || 'Could not load this goal.'); },
    });
  }

  send() {
    const text = this.draft.trim();
    if (!text || this.thinking() || this.starting()) return;
    this.messages.set([...this.messages(), { role: 'user', text }]);
    this.draft = '';
    this.summary.set(null); // refining
    this.thinking.set(true);
    this.scrollDown();
    this.api.projectAiGoalMessage(this.projectId, this.goalId(), text).subscribe({
      next: (r: TurnResponse) => this.applyTurn(r),
      error: (e) => { this.thinking.set(false); this.loadError.set(e?.error?.message || 'Something went wrong.'); },
    });
  }

  private applyTurn(r: TurnResponse) {
    this.thinking.set(false);
    if (typeof r.progress === 'number') this.progress.set(r.progress);
    if (r.type === 'summary' && r.summary) {
      this.phase.set('summary');
      this.summary.set(r.summary);
    } else if (r.type === 'question' && r.message) {
      this.phase.set('discovery');
      this.messages.set([...this.messages(), { role: 'assistant', text: r.message }]);
    }
    this.scrollDown();
  }

  confirm() {
    if (this.confirming()) return;
    this.confirming.set(true);
    this.api.confirmProjectAiGoal(this.projectId, this.goalId()).subscribe({
      next: (r) => {
        this.confirming.set(false);
        this.summary.set(null);
        this.phase.set('done');
        this.plan.set(r.plan);
        this.scrollDown();
      },
      error: (e) => { this.confirming.set(false); this.loadError.set(e?.error?.message || 'Could not build the plan.'); },
    });
  }

  openRefine() {
    this.refineText = '';
    this.refineDeadline = '';
    this.refineMessages.set([]);
    this.refinePreview.set(null);
    this.refineError.set(null);
    this.refineOpen.set(true);
  }

  closeRefine() {
    if (this.refinePreviewing() || this.refineApplying()) return;
    this.refineOpen.set(false);
    this.refineMessages.set([]);
    this.refinePreview.set(null);
    this.refineError.set(null);
  }

  // The whole refine chat, formatted for the model so it has full back-and-forth
  // context each turn (it answers questions / asks for clarity, and re-proposes
  // a plan — nothing is applied until the user locks it).
  private refineTranscript(): string {
    const lines = this.refineMessages().map((m) => `${m.role === 'user' ? 'User' : 'Zenamaze'}: ${m.text}`);
    return lines.join('\n');
  }

  sendRefine() {
    const text = this.refineText.trim();
    const deadline = this.refineDeadline || undefined;
    if ((!text && !deadline) || this.refinePreviewing()) return;
    const userLine = text || `(Set the new target date to ${deadline}.)`;
    this.refineMessages.set([...this.refineMessages(), { role: 'user', text: userLine }]);
    this.refineText = '';
    this.refinePreviewing.set(true);
    this.refineError.set(null);
    this.scrollDown();
    this.api.previewProjectRevision(this.projectId, this.goalId(), this.refineTranscript(), deadline).subscribe({
      next: (r) => {
        this.refinePreviewing.set(false);
        this.refinePreview.set(r);
        this.refineMessages.set([...this.refineMessages(), { role: 'assistant', text: r.reply || 'Updated the proposed plan below — review it and lock it in when ready.' }]);
        this.scrollDown();
      },
      error: (e) => { this.refinePreviewing.set(false); this.refineError.set(e?.error?.message || 'Could not build a revision — try again.'); },
    });
  }

  applyRefine() {
    const rp = this.refinePreview();
    if (!rp || this.refineApplying()) return;
    this.refineApplying.set(true);
    this.refineError.set(null);
    this.api.applyProjectRevision(this.projectId, this.goalId(), rp.plan).subscribe({
      next: (r) => {
        this.refineApplying.set(false);
        this.plan.set(r.plan);
        this.refineOpen.set(false);
        this.refineMessages.set([]);
        this.refinePreview.set(null);
        this.scrollDown();
      },
      error: (e) => { this.refineApplying.set(false); this.refineError.set(e?.error?.message || 'Could not apply the revision.'); },
    });
  }

  private scrollDown() {
    setTimeout(() => {
      const el = this.scrollEl?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }
}
