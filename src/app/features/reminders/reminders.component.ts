import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { OnboardingService } from '../../core/onboarding.service';
import { ReminderBus } from '../../core/reminder-bus.service';
import { GoalSummary, Recurrence, Reminder, ReminderInput, ReminderPriority } from '../../core/models';
import { BottomNavComponent } from '../../shared/bottom-nav.component';
import { TopBarComponent } from '../../shared/top-bar.component';

// Local editor form — all fields plain strings ('' when empty) so they bind
// cleanly to <input>; mapped to the nullable API shape in buildPayload().
interface ReminderForm {
  title: string;
  notes: string;
  fireDate: string;
  fireTime: string;
  recurrence: Recurrence;
  intervalDays: number; // used only when recurrence === 'custom'
  priority: ReminderPriority;
  goalId: string | null;
}

// In-app reminders. Create nudges for a day (optionally an exact time), make them
// one-off or repeating (daily/weekly/monthly), and see them grouped into Today &
// overdue / Upcoming / Done. When a reminder's moment arrives the app pops a
// dialog (see ReminderHostComponent) — this page manages them.
@Component({
  selector: 'app-reminders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BottomNavComponent, TopBarComponent],
  template: `
    <app-top-bar></app-top-bar>

    <div class="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto w-full px-4 md:px-6 lg:px-8 pt-6 md:pt-8 lg:pt-10 pb-10">
      <div class="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <a routerLink="/dashboard" class="text-body-sm text-slate-400 hover:text-white mb-1 inline-block">← Today</a>
          <h1 class="text-display md:text-display-lg gradient-text">Reminders</h1>
        </div>
        <button class="btn-primary text-sm !py-2 shrink-0" (click)="openCreate()">+ New</button>
      </div>

      @if (loading()) {
        <div class="py-20 flex justify-center"><div class="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin"></div></div>
      } @else {
        @if (reminders().length === 0) {
          <div class="glass p-8 text-center animate-fade-up">
            <p class="text-4xl mb-3">🔔</p>
            <p class="text-white font-semibold mb-1">No reminders yet</p>
            <p class="text-body-sm text-slate-400 mb-4">Set a nudge for a day and time — we'll pop it up and keep reminding until you mark it done.</p>
            <button class="btn-primary text-sm !py-2" (click)="openCreate()">Add your first reminder</button>
          </div>
        } @else {
          @if (todayList().length) {
            <section class="mb-6 animate-fade-up">
              <h2 class="text-micro uppercase tracking-wider text-accent-soft mb-2">Today &amp; overdue</h2>
              @for (r of todayList(); track r.reminderId) {
                <ng-container [ngTemplateOutlet]="row" [ngTemplateOutletContext]="{ $implicit: r }"></ng-container>
              }
            </section>
          }
          @if (upcomingList().length) {
            <section class="mb-6 animate-fade-up">
              <h2 class="text-micro uppercase tracking-wider text-slate-400 mb-2">Upcoming</h2>
              @for (r of upcomingList(); track r.reminderId) {
                <ng-container [ngTemplateOutlet]="row" [ngTemplateOutletContext]="{ $implicit: r }"></ng-container>
              }
            </section>
          }
          @if (doneList().length) {
            <section class="mb-6 animate-fade-up">
              <h2 class="text-micro uppercase tracking-wider text-slate-400 mb-2">Done</h2>
              @for (r of doneList(); track r.reminderId) {
                <ng-container [ngTemplateOutlet]="row" [ngTemplateOutletContext]="{ $implicit: r }"></ng-container>
              }
            </section>
          }
        }
      }
    </div>

    <!-- Reusable reminder row -->
    <ng-template #row let-r>
      <div class="card p-3.5 mb-2 flex items-start gap-3"
           [class.opacity-60]="r.status === 'done' || r.doneToday"
           [class.border-flame]="r.overdue && !r.doneToday">
        <button (click)="isDone(r) ? null : ack(r)"
                class="mt-0.5 h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                [class.border-slate-500]="!isDone(r)"
                [class.border-gold]="isDone(r)"
                [class.bg-gold]="isDone(r)"
                [disabled]="isDone(r)"
                [attr.aria-label]="isDone(r) ? 'Done' : 'Mark done'">
          @if (isDone(r)) {
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1a1200" stroke-width="3"><path d="M5 12l5 5L20 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          }
        </button>
        <div class="min-w-0 flex-1">
          <p class="text-white text-body-sm font-medium break-words" [class.line-through]="isDone(r)" [class.text-slate-400]="isDone(r)">{{ r.title }}</p>
          @if (r.notes) { <p class="text-caption text-slate-400 mt-0.5 break-words">{{ r.notes }}</p> }
          <div class="flex flex-wrap items-center gap-1.5 mt-1.5">
            @if (r.overdue && !r.doneToday) {
              <span class="chip border-flame/40 text-flame">Overdue · {{ r.whenLabel }}</span>
            } @else {
              <span class="chip text-slate-300">{{ r.whenLabel }}</span>
            }
            @if (r.recurrence === 'custom') {
              <span class="chip text-accent-soft">↻ every {{ r.intervalDays }} days</span>
            } @else if (r.recurrence !== 'none') {
              <span class="chip text-accent-soft capitalize">↻ {{ r.recurrence }}</span>
            }
            @if (r.priority !== 'normal') {
              <span class="chip capitalize" [ngClass]="r.priority === 'high' ? 'text-flame border-flame/40' : 'text-slate-400'">{{ r.priority }}</span>
            }
            @if (r.goalId) {
              <span class="chip border-gold/40 text-gold">🎯 {{ goalTitle(r.goalId) }}</span>
            }
          </div>
        </div>
        <div class="flex flex-col items-end gap-1 shrink-0">
          <button class="text-caption text-slate-400 hover:text-white" (click)="openEdit(r)">Edit</button>
          <button class="text-caption text-slate-500 hover:text-flame" (click)="confirmDelete.set(r)">Delete</button>
        </div>
      </div>
    </ng-template>

    <!-- Create / edit modal -->
    @if (editorOpen()) {
      <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" (click)="closeEditor()">
        <div class="glass-strong w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <div class="p-5 overflow-y-auto flex-1">
          <h2 class="text-heading text-white font-bold mb-4">{{ editingId() ? 'Edit reminder' : 'New reminder' }}</h2>

          <label class="label">Title</label>
          <input class="input mb-3" [(ngModel)]="form.title" placeholder="Remind me to…" (keyup.enter)="save()" />

          <label class="label">Notes <span class="text-slate-500">(optional)</span></label>
          <textarea class="input resize-none mb-3" rows="2" [(ngModel)]="form.notes" placeholder="Any detail…"></textarea>

          <div class="grid grid-cols-2 gap-3 mb-3">
            <div><label class="label">Date</label><input type="date" class="input" [(ngModel)]="form.fireDate" /></div>
            <div><label class="label">Time <span class="text-slate-500">(optional)</span></label><input type="time" class="input" [(ngModel)]="form.fireTime" /></div>
          </div>

          <label class="label">Repeat</label>
          <div class="flex flex-wrap gap-2 mb-3">
            @for (o of recurrences; track o.value) {
              <button type="button" class="chip" [class.border-accent]="form.recurrence === o.value" [class.text-white]="form.recurrence === o.value" (click)="form.recurrence = o.value">{{ o.label }}</button>
            }
          </div>
          @if (form.recurrence === 'custom') {
            <div class="flex items-center gap-2 mb-3">
              <span class="text-body-sm text-slate-300">Every</span>
              <input type="number" min="1" max="365" class="input !w-20 text-center" [(ngModel)]="form.intervalDays" />
              <span class="text-body-sm text-slate-300">days</span>
            </div>
          }

          <label class="label">Priority</label>
          <div class="flex gap-2 mb-3">
            @for (p of priorities; track p) {
              <button type="button" class="chip capitalize" [class.border-accent]="form.priority === p" [class.text-white]="form.priority === p" (click)="form.priority = p">{{ p }}</button>
            }
          </div>

          <label class="label">Link to a goal <span class="text-slate-500">(optional)</span></label>
          <select class="input mb-4" [(ngModel)]="form.goalId">
            <option [ngValue]="null">No goal</option>
            @for (g of goals(); track g.goalId) {
              <option [ngValue]="g.goalId">{{ g.title }}</option>
            }
          </select>

          @if (formError()) { <p class="text-flame text-caption mb-3">{{ formError() }}</p> }
          </div>

          <div class="flex gap-2 justify-end p-5 pt-4 border-t border-white/10 shrink-0">
            <button class="btn-ghost text-sm !py-2" (click)="closeEditor()">Cancel</button>
            <button class="btn-primary text-sm !py-2" (click)="save()" [disabled]="saving() || !form.title.trim()">
              {{ saving() ? 'Saving…' : (editingId() ? 'Save' : 'Add reminder') }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Delete confirm -->
    @if (confirmDelete(); as r) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" (click)="confirmDelete.set(null)">
        <div class="glass-strong w-full max-w-sm rounded-3xl p-5" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <p class="text-white font-semibold mb-1">Delete this reminder?</p>
          <p class="text-body-sm text-slate-400 mb-4 break-words">"{{ r.title }}" will be removed.</p>
          <div class="flex gap-2 justify-end">
            <button class="btn-ghost text-sm !py-2" (click)="confirmDelete.set(null)">Cancel</button>
            <button class="btn-primary text-sm !py-2 !bg-flame" (click)="remove(r)">Delete</button>
          </div>
        </div>
      </div>
    }

    <!-- Toast -->
    @if (toast(); as msg) {
      <div class="fixed bottom-28 md:bottom-8 inset-x-0 flex justify-center z-50 px-4 pointer-events-none">
        <div class="glass-strong px-4 py-2.5 rounded-full text-body-sm text-white animate-fade-up">{{ msg }}</div>
      </div>
    }

    <app-bottom-nav></app-bottom-nav>
  `,
})
export class RemindersComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  reminders = signal<Reminder[]>([]);
  goals = signal<GoalSummary[]>([]);

  editorOpen = signal(false);
  editingId = signal<string | null>(null);
  formError = signal<string | null>(null);
  confirmDelete = signal<Reminder | null>(null);
  toast = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  recurrences: { value: Recurrence; label: string }[] = [
    { value: 'none', label: 'Once' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'custom', label: 'Custom' },
  ];
  priorities: ReminderPriority[] = ['low', 'normal', 'high'];

  form: ReminderForm = this.blankForm();

  private active = computed(() => this.reminders().filter((r) => r.status === 'active'));
  // Today: overdue, due now, scheduled for today, or already marked done today (retained).
  todayList = computed(() =>
    this.active().filter((r) => r.overdue || r.dueNow || r.doneToday || this.isTodayLabel(r))
  );
  upcomingList = computed(() =>
    this.active().filter((r) => !(r.overdue || r.dueNow || r.doneToday || this.isTodayLabel(r)))
  );
  doneList = computed(() => this.reminders().filter((r) => r.status === 'done'));

  constructor(private api: ApiService, private route: ActivatedRoute, private bus: ReminderBus, private onboarding: OnboardingService) {}

  ngOnInit(): void {
    this.load();
    this.api.listGoals().subscribe({ next: (r) => this.goals.set(r.goals || []) });
    if (this.route.snapshot.queryParamMap.get('new')) this.openCreate();
  }

  load() {
    this.loading.set(true);
    this.api.listReminders().subscribe({
      next: (r) => {
        this.reminders.set(r.reminders || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  isDone(r: Reminder): boolean {
    return r.status === 'done' || r.doneToday;
  }

  private isTodayLabel(r: Reminder): boolean {
    return r.whenLabel.startsWith('Today') || r.whenLabel.startsWith('Yesterday');
  }

  private blankForm(): ReminderForm {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return { title: '', notes: '', fireDate: iso, fireTime: '', recurrence: 'none', intervalDays: 14, priority: 'normal', goalId: null };
  }

  openCreate() {
    this.form = this.blankForm();
    this.editingId.set(null);
    this.formError.set(null);
    this.editorOpen.set(true);
  }

  openEdit(r: Reminder) {
    this.form = {
      title: r.title,
      notes: r.notes || '',
      fireDate: r.fireDate,
      fireTime: r.fireTime || '',
      recurrence: r.recurrence,
      intervalDays: r.intervalDays || 14,
      priority: r.priority,
      goalId: r.goalId,
    };
    this.editingId.set(r.reminderId);
    this.formError.set(null);
    this.editorOpen.set(true);
  }

  closeEditor() {
    this.editorOpen.set(false);
  }

  private buildPayload(): ReminderInput | null {
    const title = this.form.title.trim();
    if (!title) return null;
    if (!this.form.fireDate) { this.formError.set('Pick a date.'); return null; }
    const custom = this.form.recurrence === 'custom';
    const interval = Math.trunc(Number(this.form.intervalDays));
    if (custom && (!Number.isInteger(interval) || interval < 1 || interval > 365)) {
      this.formError.set('Enter a repeat interval between 1 and 365 days.');
      return null;
    }
    return {
      title,
      notes: this.form.notes.trim() || null,
      goalId: this.form.goalId || null,
      fireDate: this.form.fireDate,
      fireTime: this.form.fireTime || null,
      recurrence: this.form.recurrence,
      intervalDays: custom ? interval : null,
      priority: this.form.priority,
    };
  }

  save() {
    this.formError.set(null);
    const payload = this.buildPayload();
    if (!payload || this.saving()) return;
    this.saving.set(true);
    const id = this.editingId();
    const req = id ? this.api.updateReminder(id, payload) : this.api.createReminder(payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.editorOpen.set(false);
        this.showToast(id ? 'Updated' : 'Reminder set');
        this.bus.notifyChanged(); // let the global host schedule its timer now
        // First real reminder during the guided run → advance to the finale.
        if (!id) this.onboarding.reportReminderCreated();
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.formError.set(e?.error?.message || 'Something went wrong.');
      },
    });
  }

  ack(r: Reminder) {
    // Optimistic: mark done-today, retain in place.
    this.patch(r.reminderId, { doneToday: true, dueNow: false, overdue: false });
    this.api.ackReminder(r.reminderId).subscribe({
      next: (res) => { this.patch(r.reminderId, res.reminder); this.bus.notifyChanged(); this.showToast('Marked done'); },
      error: () => { this.patch(r.reminderId, { doneToday: false }); this.showToast('Could not save — try again'); },
    });
  }

  remove(r: Reminder) {
    this.confirmDelete.set(null);
    const prev = this.reminders();
    this.reminders.set(prev.filter((x) => x.reminderId !== r.reminderId));
    this.api.deleteReminder(r.reminderId).subscribe({
      next: () => { this.bus.notifyChanged(); this.showToast('Deleted'); },
      error: () => { this.reminders.set(prev); this.showToast('Could not delete — try again'); },
    });
  }

  private patch(id: string, fields: Partial<Reminder>) {
    this.reminders.set(this.reminders().map((r) => (r.reminderId === id ? { ...r, ...fields } : r)));
  }

  goalTitle(goalId: string): string {
    const g = this.goals().find((x) => x.goalId === goalId);
    return g ? g.title : 'Goal';
  }

  private showToast(msg: string) {
    this.toast.set(msg);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 2600);
  }
}
