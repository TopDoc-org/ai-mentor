import { Component, EventEmitter, Input, OnDestroy, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ProjectReport, ReportStatus, SuggestionAction } from '../core/models';

// Reused from the Today page, project-detail's checkpoint list, and a task's
// "flag blocked" button — one modal serves both entry points into the same
// async AI-suggestion engine: a scheduled checkpoint report (on_track/challenge)
// or an anytime task-blocker flag (always 'blocked').
@Component({
  selector: 'app-report-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50"
         (click)="close()" (keydown.escape)="close()" tabindex="-1">
      <div class="glass-strong p-6 w-full max-w-md animate-fade-up" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">

        <!-- Form step -->
        <ng-container *ngIf="phase() === 'form'">
          <h3 class="text-heading text-white mb-1">{{ mode === 'checkpoint' ? 'Checkpoint report' : 'Flag this task blocked' }}</h3>
          <p class="text-body-sm text-slate-400 mb-4">{{ mode === 'checkpoint' ? checkpointTarget : taskTitle }}</p>

          <div *ngIf="mode === 'checkpoint'" class="flex gap-2 mb-3">
            <button type="button" class="flex-1 rounded-xl border p-3 text-left transition"
                    [ngClass]="status() === 'on_track' ? 'border-accent bg-accent/10' : 'border-white/10 hover:border-white/20'"
                    (click)="status.set('on_track')">
              <span class="block text-body-sm text-white font-medium">✅ On track</span>
            </button>
            <button type="button" class="flex-1 rounded-xl border p-3 text-left transition"
                    [ngClass]="status() === 'challenge' ? 'border-flame bg-flame/10' : 'border-white/10 hover:border-white/20'"
                    (click)="status.set('challenge')">
              <span class="block text-body-sm text-white font-medium">⚠ Hit a challenge</span>
            </button>
          </div>

          <textarea *ngIf="mode === 'blocker' || status() === 'challenge'"
                    class="input resize-none w-full" rows="3" [(ngModel)]="note"
                    placeholder="What's going on? Zenamaze will suggest a way forward."></textarea>

          <div class="flex gap-2 justify-end mt-4">
            <button class="btn-ghost text-sm !py-2" (click)="close()">Cancel</button>
            <button class="btn-primary text-sm !py-2" (click)="submit()" [disabled]="submitting() || !canSubmit()">
              {{ submitting() ? 'Submitting…' : 'Submit' }}
            </button>
          </div>
        </ng-container>

        <!-- Thinking step -->
        <ng-container *ngIf="phase() === 'polling'">
          <div class="text-center py-6">
            <div class="h-10 w-10 mx-auto rounded-full border-2 border-accent border-t-transparent animate-spin mb-4"></div>
            <p class="text-body text-white">Zenamaze is thinking…</p>
            <p class="text-caption text-slate-400 mt-1">Working out a way forward for you.</p>
          </div>
        </ng-container>

        <!-- Result step -->
        <ng-container *ngIf="phase() === 'result'">
          <h3 class="text-heading text-white mb-1">{{ report()?.status === 'on_track' ? 'Nice — keep going' : 'Here\\'s what I\\'d try' }}</h3>

          <ng-container *ngIf="report() as r">
            <p *ngIf="r.status === 'on_track'" class="text-body-sm text-slate-400 mb-4">Logged. Stay on pace.</p>

            <ng-container *ngIf="r.status !== 'on_track'">
              <p *ngIf="r.aiState === 'failed'" class="text-body-sm text-flame mb-3">Couldn't reach Zenamaze just now.</p>
              <button *ngIf="r.aiState === 'failed'" class="btn-ghost text-sm !py-2 mb-3" (click)="regenerate()">Try again</button>

              <p *ngIf="r.aiSuggestion?.summary" class="text-body-sm text-slate-200 mb-3">{{ r.aiSuggestion?.summary }}</p>

              <div *ngIf="!r.aiSuggestion?.actions?.length && r.aiState === 'ready'" class="text-body-sm text-slate-400 mb-3">
                Nothing to change on your end right now.
              </div>

              <div class="space-y-2">
                <div *ngFor="let a of r.aiSuggestion?.actions || []" class="rounded-xl border border-white/10 p-3">
                  <p class="text-body-sm text-white">{{ actionLabel(a) }}</p>
                  <p class="text-caption text-slate-400 mt-0.5">{{ a.rationale }}</p>

                  <div *ngIf="a.status === 'pending'" class="flex gap-2 justify-end mt-2">
                    <button class="btn-ghost text-caption !py-1 !px-2.5" (click)="dismissAction(a.actionId)">Dismiss</button>
                    <button class="btn-primary text-caption !py-1 !px-2.5" (click)="acceptAction(a.actionId)">Accept</button>
                  </div>
                  <p *ngIf="a.status === 'applied'" class="text-caption text-accent-soft mt-2">✓ Applied</p>
                  <p *ngIf="a.status === 'dismissed'" class="text-caption text-slate-500 mt-2">Dismissed</p>
                  <p *ngIf="a.status === 'pending_approval'" class="text-caption text-gold mt-2">Waiting for owner approval</p>
                  <p *ngIf="a.status === 'approved'" class="text-caption text-accent-soft mt-2">✓ Approved</p>
                  <p *ngIf="a.status === 'rejected'" class="text-caption text-slate-500 mt-2">Not approved</p>
                </div>
              </div>
            </ng-container>
          </ng-container>

          <div class="flex justify-end mt-4">
            <button class="btn-primary text-sm !py-2" (click)="close()">Done</button>
          </div>
        </ng-container>
      </div>
    </div>
  `,
})
export class ReportModalComponent implements OnDestroy {
  @Input() mode: 'checkpoint' | 'blocker' = 'checkpoint';
  // checkpoint mode
  @Input() projectId = '';
  @Input() goalId = '';
  @Input() checkpointId = '';
  @Input() checkpointTarget = '';
  // blocker mode
  @Input() taskId = '';
  @Input() taskTitle = '';

  @Output() closed = new EventEmitter<void>();
  @Output() resolved = new EventEmitter<ProjectReport>();

  phase = signal<'form' | 'polling' | 'result'>('form');
  status = signal<ReportStatus>('on_track');
  note = '';
  submitting = signal(false);
  report = signal<ProjectReport | null>(null);
  private pollHandle: ReturnType<typeof setInterval> | null = null;

  constructor(private api: ApiService) {}

  canSubmit(): boolean {
    if (this.mode === 'blocker') return this.note.trim().length > 0;
    if (this.status() === 'challenge') return this.note.trim().length > 0;
    return true;
  }

  submit() {
    if (this.submitting() || !this.canSubmit()) return;
    this.submitting.set(true);
    const note = this.note.trim() || undefined;
    const req$ = this.mode === 'blocker'
      ? this.api.flagTaskBlocked(this.taskId, note || '')
      : this.api.submitCheckpointReport(this.projectId, this.goalId, this.checkpointId, { status: this.status(), note });
    req$.subscribe({
      next: (r) => {
        this.submitting.set(false);
        this.report.set(r.report);
        if (r.report.aiState === 'generating') { this.phase.set('polling'); this.startPolling(); }
        else this.phase.set('result');
      },
      error: () => { this.submitting.set(false); },
    });
  }

  private startPolling() {
    this.stopPolling();
    this.pollHandle = setInterval(() => {
      this.api.getCheckpointReport(this.report()!.reportId).subscribe({
        next: (r) => {
          this.report.set(r.report);
          if (r.report.aiState !== 'generating') { this.stopPolling(); this.phase.set('result'); }
        },
        error: () => { this.stopPolling(); this.phase.set('result'); },
      });
    }, 2500);
  }

  private stopPolling() {
    if (this.pollHandle) { clearInterval(this.pollHandle); this.pollHandle = null; }
  }

  regenerate() {
    const r = this.report();
    if (!r) return;
    this.api.regenerateCheckpointReport(r.reportId).subscribe({
      next: (res) => { this.report.set(res.report); this.phase.set('polling'); this.startPolling(); },
    });
  }

  acceptAction(actionId: string) {
    const r = this.report();
    if (!r) return;
    this.api.acceptCheckpointAction(r.reportId, actionId).subscribe({
      next: (res) => this.report.set(res.report),
    });
  }

  dismissAction(actionId: string) {
    const r = this.report();
    if (!r) return;
    this.api.dismissCheckpointAction(r.reportId, actionId).subscribe({
      next: (res) => this.report.set(res.report),
    });
  }

  actionLabel(a: SuggestionAction): string {
    switch (a.type) {
      case 'extend_due': return `Push the due date to ${a.newDueDate}`;
      case 'split_task': return `Split into: ${(a.splitInto || []).map((p) => p.title).join(' + ')}`;
      case 'reduce_scope': return `Trim scope${a.newTitle ? ' to "' + a.newTitle + '"' : ''}`;
      case 'reassign': return `Reassign to a teammate with more room`;
      case 'revise_plan': return `Restructure the whole plan (needs owner approval)`;
      default: return '';
    }
  }

  close() {
    this.stopPolling();
    const r = this.report();
    if (r) this.resolved.emit(r);
    this.closed.emit();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }
}
