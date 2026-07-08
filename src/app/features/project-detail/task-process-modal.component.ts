import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ChatMessage, ProjectReminder, ProjectTask, TaskProcessTurn } from '../../core/models';

// The "daily process" mini-interview for a just-assigned project task. A short
// (<=3 question) Zenamaze chat that lands on ONE keystone daily action + a time of
// day, then attaches a daily reminder for the assignee. Auto-opened by
// project-detail when a task the current user is assigned is `pending_setup`;
// also reachable manually. Mirrors the project-ai-goal chat aesthetic.
@Component({
  selector: 'app-task-process-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:px-4 z-50"
         (click)="close()" (keydown.escape)="close()" tabindex="-1">
      <div class="glass-strong w-full sm:max-w-md max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl p-5 animate-fade-up"
           role="dialog" aria-modal="true" (click)="$event.stopPropagation()">

        <header class="mb-3">
          <p class="text-micro uppercase tracking-wider text-accent-soft">Make it a daily habit</p>
          <h3 class="text-heading text-white leading-snug">{{ taskTitle }}</h3>
          <p class="text-caption text-slate-400 mt-0.5">Let's find the one thing to do each day — and block time for it.</p>
        </header>

        <!-- Chat transcript -->
        <div class="flex-1 overflow-y-auto -mx-1 px-1 py-2 space-y-4">
          @for (m of messages(); track $index) {
            <div class="animate-fade-up flex items-end gap-2.5" [class.flex-row-reverse]="m.role === 'user'">
              @if (m.role === 'user') {
                <div class="h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold bg-white/10 text-slate-200 border border-white/10">You</div>
              } @else {
                <img src="icon.svg" alt="" class="h-7 w-7 shrink-0 rounded-full object-cover shadow-glow">
              }
              <div class="max-w-[80%] rounded-2xl px-3.5 py-2 text-body-sm whitespace-pre-wrap"
                   [ngClass]="m.role === 'user' ? 'bg-accent text-white rounded-br-sm' : 'glass text-slate-100 rounded-bl-sm'">{{ m.text }}</div>
            </div>
          }

          @if (thinking()) {
            <div class="flex items-end gap-2.5">
              <img src="icon.svg" alt="" class="h-7 w-7 rounded-full object-cover shadow-glow">
              <div class="glass rounded-2xl rounded-bl-sm px-4 py-3"><div class="flex gap-1"><span class="h-2 w-2 rounded-full bg-slate-400 animate-bounce"></span><span class="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style="animation-delay:.15s"></span><span class="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style="animation-delay:.3s"></span></div></div>
            </div>
          }

          <!-- Proposal card -->
          @if (proposal(); as p) {
            <div class="glass-strong rounded-2xl p-4 animate-fade-up border border-accent/30">
              <p class="text-micro uppercase tracking-wider text-accent-soft mb-1">Your daily process</p>
              <p class="text-body text-white font-medium mb-3">⏱ {{ p.action }}</p>
              <label class="block text-caption text-slate-400 mb-1">What time each day?</label>
              <input type="time" class="input w-full mb-3" [(ngModel)]="fireTime" />
              @if (p.minutes) { <p class="text-caption text-slate-500 mb-3">About {{ p.minutes }} min/day · a daily reminder will be set.</p> }
              <div class="flex gap-2">
                <button class="btn-primary text-sm !py-2 flex-1" (click)="attach()" [disabled]="attaching()">
                  {{ attaching() ? 'Attaching…' : 'Attach daily process' }}
                </button>
                <button class="btn-ghost text-sm !py-2" (click)="skip()" [disabled]="attaching()">Not now</button>
              </div>
            </div>
          }
        </div>

        @if (error(); as e) { <p class="text-body-sm text-flame mt-2">{{ e }}</p> }

        <!-- Composer (hidden once a proposal is on screen) -->
        @if (!proposal() && !loading()) {
          <div class="flex items-end gap-2 mt-3">
            <textarea class="input flex-1 resize-none" rows="1" [(ngModel)]="draft"
                      (keydown.enter)="$event.preventDefault(); send()"
                      placeholder="Type your answer…" [disabled]="thinking()"></textarea>
            <button class="btn-primary !py-2.5 shrink-0" (click)="send()" [disabled]="thinking() || !draft.trim()">Send</button>
          </div>
          <button class="text-caption text-slate-500 hover:text-slate-300 mt-2 self-center" (click)="skip()" [disabled]="attaching()">Skip — I'll set this up later</button>
        }

        @if (loading()) {
          <div class="text-center py-6"><div class="h-8 w-8 mx-auto rounded-full border-2 border-accent border-t-transparent animate-spin"></div></div>
        }
      </div>
    </div>
  `,
})
export class TaskProcessModalComponent implements OnInit {
  @Input({ required: true }) taskId!: string;
  @Input() taskTitle = 'this task';
  @Output() attached = new EventEmitter<{ task: ProjectTask; reminder: ProjectReminder }>();
  @Output() skipped = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  messages = signal<ChatMessage[]>([]);
  proposal = signal<{ action: string; minutes: number | null } | null>(null);
  loading = signal(true);
  thinking = signal(false);
  attaching = signal(false);
  error = signal<string | null>(null);
  draft = '';
  fireTime = '09:00';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.startTaskProcess(this.taskId).subscribe({
      next: (t) => { this.loading.set(false); this.applyTurn(t); },
      error: (e) => { this.loading.set(false); this.error.set(e?.error?.message || 'Could not start setup.'); },
    });
  }

  private applyTurn(t: TaskProcessTurn) {
    if (Array.isArray(t.messages)) this.messages.set(t.messages);
    if (t.type === 'proposal' || (t.action && t.processStatus !== 'active')) {
      if (t.fireTime) this.fireTime = t.fireTime;
      this.proposal.set({ action: t.action || this.taskTitle, minutes: t.minutes ?? null });
    }
  }

  send() {
    const text = this.draft.trim();
    if (!text || this.thinking()) return;
    this.messages.set([...this.messages(), { role: 'user', text }]);
    this.draft = '';
    this.thinking.set(true);
    this.error.set(null);
    this.api.taskProcessMessage(this.taskId, text).subscribe({
      next: (t) => { this.thinking.set(false); this.applyTurn(t); },
      error: (e) => { this.thinking.set(false); this.error.set(e?.error?.message || 'Something went wrong.'); },
    });
  }

  attach() {
    const p = this.proposal();
    if (!p || this.attaching()) return;
    this.attaching.set(true);
    this.error.set(null);
    this.api.confirmTaskProcess(this.taskId, { action: p.action, minutes: p.minutes ?? undefined, fireTime: this.fireTime }).subscribe({
      next: (r) => { this.attaching.set(false); this.attached.emit(r); },
      error: (e) => { this.attaching.set(false); this.error.set(e?.error?.message || 'Could not attach — try again.'); },
    });
  }

  skip() {
    if (this.attaching()) return;
    this.attaching.set(true);
    this.api.skipTaskProcess(this.taskId).subscribe({
      next: () => { this.attaching.set(false); this.skipped.emit(); },
      error: () => { this.attaching.set(false); this.skipped.emit(); },
    });
  }

  close() { this.closed.emit(); }
}
