import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { OnboardingService } from '../../core/onboarding.service';
import { GoalSummary, Todo, TodoInput, TodoPriority, TodoSchedule } from '../../core/models';
import { BottomNavComponent } from '../../shared/bottom-nav.component';
import { TopBarComponent } from '../../shared/top-bar.component';

// Local editor form — all date fields are plain strings ('' when empty) so they
// bind cleanly to <input>; mapped to the nullable API shape in buildPayload().
interface TodoForm {
  title: string;
  notes: string;
  schedule: TodoSchedule;
  dueDate: string;
  startDate: string;
  endDate: string;
  priority: TodoPriority;
  goalId: string | null;
}

// Free-standing to-do list. Create tasks scheduled four ways (a date, a "by"
// deadline, a start–end span, or someday), optionally link them to a goal
// (worth more points), and see them prioritized by urgency into
// Overdue+Today / Upcoming / Someday, plus a Done section.
@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BottomNavComponent, TopBarComponent],
  template: `
    <app-top-bar></app-top-bar>

    <div class="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto w-full px-4 md:px-6 lg:px-8 pt-6 md:pt-8 lg:pt-10 pb-28 md:pb-10">
      <div class="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <a routerLink="/dashboard" class="text-body-sm text-slate-400 hover:text-white mb-1 inline-block">← Today</a>
          <h1 class="text-display md:text-display-lg gradient-text">To-dos</h1>
        </div>
        <button class="btn-primary text-sm !py-2 shrink-0" (click)="openCreate()">+ New</button>
      </div>

      @if (loading()) {
        <div class="py-20 flex justify-center"><div class="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin"></div></div>
      } @else {
        @if (todos().length === 0) {
          <div class="glass p-8 text-center animate-fade-up">
            <p class="text-4xl mb-3">📝</p>
            <p class="text-white font-semibold mb-1">No to-dos yet</p>
            <p class="text-body-sm text-slate-400 mb-4">Jot something you need to get done — link it to a goal to earn more points.</p>
            <button class="btn-primary text-sm !py-2" (click)="openCreate()">Add your first to-do</button>
          </div>
        } @else {
          @if (todayList().length) {
            <section class="mb-6 animate-fade-up">
              <h2 class="text-micro uppercase tracking-wider text-accent-soft mb-2">Today &amp; overdue</h2>
              @for (t of todayList(); track t.todoId) {
                <ng-container [ngTemplateOutlet]="row" [ngTemplateOutletContext]="{ $implicit: t }"></ng-container>
              }
            </section>
          }
          @if (upcomingList().length) {
            <section class="mb-6 animate-fade-up">
              <h2 class="text-micro uppercase tracking-wider text-slate-400 mb-2">Upcoming</h2>
              @for (t of upcomingList(); track t.todoId) {
                <ng-container [ngTemplateOutlet]="row" [ngTemplateOutletContext]="{ $implicit: t }"></ng-container>
              }
            </section>
          }
          @if (somedayList().length) {
            <section class="mb-6 animate-fade-up">
              <h2 class="text-micro uppercase tracking-wider text-slate-400 mb-2">Someday</h2>
              @for (t of somedayList(); track t.todoId) {
                <ng-container [ngTemplateOutlet]="row" [ngTemplateOutletContext]="{ $implicit: t }"></ng-container>
              }
            </section>
          }
          @if (doneList().length) {
            <section class="mb-6 animate-fade-up">
              <h2 class="text-micro uppercase tracking-wider text-slate-400 mb-2">Done</h2>
              @for (t of doneList(); track t.todoId) {
                <ng-container [ngTemplateOutlet]="row" [ngTemplateOutletContext]="{ $implicit: t }"></ng-container>
              }
            </section>
          }
        }
      }
    </div>

    <!-- Reusable to-do row -->
    <ng-template #row let-t>
      <div class="card p-3.5 mb-2 flex items-start gap-3" [class.opacity-60]="t.status === 'done'">
        <button (click)="t.status === 'done' ? reopen(t) : complete(t)"
                class="mt-0.5 h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                [class.border-slate-500]="t.status !== 'done'"
                [class.border-gold]="t.status === 'done'"
                [class.bg-gold]="t.status === 'done'"
                [attr.aria-label]="t.status === 'done' ? 'Mark not done' : 'Mark done'">
          @if (t.status === 'done') {
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1a1200" stroke-width="3"><path d="M5 12l5 5L20 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          }
        </button>
        <div class="min-w-0 flex-1">
          <p class="text-white text-body-sm font-medium break-words" [class.line-through]="t.status === 'done'" [class.text-slate-400]="t.status === 'done'">{{ t.title }}</p>
          @if (t.notes) { <p class="text-caption text-slate-400 mt-0.5 break-words">{{ t.notes }}</p> }
          <div class="flex flex-wrap items-center gap-1.5 mt-1.5">
            @if (t.overdue) {
              <span class="chip border-flame/40 text-flame">Overdue{{ scheduleLabel(t) ? ' · ' + scheduleLabel(t) : '' }}</span>
            } @else if (scheduleLabel(t)) {
              <span class="chip text-slate-300">{{ scheduleLabel(t) }}</span>
            }
            @if (t.priority !== 'normal') {
              <span class="chip" [ngClass]="t.priority === 'high' ? 'text-flame border-flame/40' : 'text-slate-400'">{{ t.priority }}</span>
            }
            @if (t.goalId) {
              <span class="chip border-gold/40 text-gold">🎯 {{ goalTitle(t.goalId) }} · +{{ t.pointsValue }}</span>
            } @else {
              <span class="chip text-slate-400">+{{ t.pointsValue }} pts</span>
            }
          </div>
        </div>
        <div class="flex flex-col items-end gap-1 shrink-0">
          <button class="text-caption text-slate-400 hover:text-white" (click)="openEdit(t)">Edit</button>
          <button class="text-caption text-slate-500 hover:text-flame" (click)="confirmDelete.set(t)">Delete</button>
        </div>
      </div>
    </ng-template>

    <!-- Create / edit modal -->
    @if (editorOpen()) {
      <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" (click)="closeEditor()">
        <div class="glass-strong w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <div class="p-5 overflow-y-auto flex-1">
          <h2 class="text-heading text-white font-bold mb-4">{{ editingId() ? 'Edit to-do' : 'New to-do' }}</h2>

          <label class="label">Title</label>
          <input class="input mb-3" [(ngModel)]="form.title" placeholder="What needs doing?" (keyup.enter)="save()" />

          <label class="label">Notes <span class="text-slate-500">(optional)</span></label>
          <textarea class="input resize-none mb-3" rows="2" [(ngModel)]="form.notes" placeholder="Any detail…"></textarea>

          <label class="label">When</label>
          <div class="flex flex-wrap gap-2 mb-3">
            @for (s of schedules; track s.value) {
              <button type="button" class="chip" [class.border-accent]="form.schedule === s.value" [class.text-white]="form.schedule === s.value" (click)="form.schedule = s.value">{{ s.label }}</button>
            }
          </div>

          @if (form.schedule === 'date' || form.schedule === 'deadline') {
            <label class="label">{{ form.schedule === 'deadline' ? 'By date' : 'Due date' }}</label>
            <input type="date" class="input mb-3" [(ngModel)]="form.dueDate" />
          }
          @if (form.schedule === 'span') {
            <div class="grid grid-cols-2 gap-3 mb-3">
              <div><label class="label">Start</label><input type="date" class="input" [(ngModel)]="form.startDate" /></div>
              <div><label class="label">End</label><input type="date" class="input" [(ngModel)]="form.endDate" /></div>
            </div>
          }

          <label class="label">Priority</label>
          <div class="flex gap-2 mb-3">
            @for (p of priorities; track p) {
              <button type="button" class="chip capitalize" [class.border-accent]="form.priority === p" [class.text-white]="form.priority === p" (click)="form.priority = p">{{ p }}</button>
            }
          </div>

          <label class="label">Link to a goal <span class="text-gold">(earns more points)</span></label>
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
              {{ saving() ? 'Saving…' : (editingId() ? 'Save' : 'Add to-do') }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Delete confirm -->
    @if (confirmDelete(); as t) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" (click)="confirmDelete.set(null)">
        <div class="glass-strong w-full max-w-sm rounded-3xl p-5" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <p class="text-white font-semibold mb-1">Delete this to-do?</p>
          <p class="text-body-sm text-slate-400 mb-4 break-words">"{{ t.title }}" will be removed.</p>
          <div class="flex gap-2 justify-end">
            <button class="btn-ghost text-sm !py-2" (click)="confirmDelete.set(null)">Cancel</button>
            <button class="btn-primary text-sm !py-2 !bg-flame" (click)="remove(t)">Delete</button>
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
export class TasksComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  todos = signal<Todo[]>([]);
  goals = signal<GoalSummary[]>([]);

  editorOpen = signal(false);
  editingId = signal<string | null>(null);
  formError = signal<string | null>(null);
  confirmDelete = signal<Todo | null>(null);
  toast = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  schedules: { value: TodoSchedule; label: string }[] = [
    { value: 'date', label: 'On a date' },
    { value: 'deadline', label: 'By a deadline' },
    { value: 'span', label: 'Over a span' },
    { value: 'none', label: 'Someday' },
  ];
  priorities: TodoPriority[] = ['low', 'normal', 'high'];

  form: TodoForm = this.blankForm();

  // Buckets (open items grouped by urgency; done split out)
  private open = computed(() => this.todos().filter((t) => t.status === 'open'));
  todayList = computed(() => this.open().filter((t) => t.bucket === 'overdue' || t.bucket === 'today'));
  upcomingList = computed(() => this.open().filter((t) => t.bucket === 'upcoming'));
  somedayList = computed(() => this.open().filter((t) => t.bucket === 'someday'));
  doneList = computed(() => this.todos().filter((t) => t.status === 'done'));

  constructor(private api: ApiService, private route: ActivatedRoute, private onboarding: OnboardingService) {}

  ngOnInit(): void {
    this.load();
    this.api.listGoals().subscribe({ next: (r) => this.goals.set(r.goals || []) });
    // Opened from the dashboard "+" chooser → jump straight into create.
    // During the guided first-run, open frictionless (no date required) so the
    // brand-new user can save a title-only to-do the moment Pip says "hit Add".
    if (this.route.snapshot.queryParamMap.get('new')) this.openCreate(this.onboarding.active());
  }

  load() {
    this.loading.set(true);
    this.api.listTodos().subscribe({
      next: (r) => {
        this.todos.set(r.todos || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private blankForm(): TodoForm {
    return { title: '', notes: '', schedule: 'date', dueDate: '', startDate: '', endDate: '', priority: 'normal', goalId: null };
  }

  openCreate(frictionless = false) {
    this.form = this.blankForm();
    // Frictionless = no scheduling gate: a title alone is a valid to-do.
    if (frictionless) this.form.schedule = 'none';
    this.editingId.set(null);
    this.formError.set(null);
    this.editorOpen.set(true);
  }

  openEdit(t: Todo) {
    this.form = {
      title: t.title,
      notes: t.notes || '',
      schedule: t.schedule,
      dueDate: t.dueDate || '',
      startDate: t.startDate || '',
      endDate: t.endDate || '',
      priority: t.priority,
      goalId: t.goalId,
    };
    this.editingId.set(t.todoId);
    this.formError.set(null);
    this.editorOpen.set(true);
  }

  closeEditor() {
    this.editorOpen.set(false);
  }

  private buildPayload(): TodoInput | null {
    const title = this.form.title.trim();
    if (!title) return null;
    const p: TodoInput = {
      title,
      notes: this.form.notes.trim() || null,
      priority: this.form.priority,
      goalId: this.form.goalId || null,
      schedule: this.form.schedule,
      dueDate: null,
      startDate: null,
      endDate: null,
    };
    if (this.form.schedule === 'date' || this.form.schedule === 'deadline') {
      if (!this.form.dueDate) { this.formError.set('Pick a date.'); return null; }
      p.dueDate = this.form.dueDate;
    } else if (this.form.schedule === 'span') {
      if (!this.form.startDate || !this.form.endDate) { this.formError.set('Pick a start and end date.'); return null; }
      if (this.form.startDate > this.form.endDate) { this.formError.set('Start must be on or before end.'); return null; }
      p.startDate = this.form.startDate;
      p.endDate = this.form.endDate;
    }
    return p;
  }

  save() {
    this.formError.set(null);
    const payload = this.buildPayload();
    if (!payload || this.saving()) return;
    this.saving.set(true);
    const id = this.editingId();
    const req = id ? this.api.updateTodo(id, payload) : this.api.createTodo(payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.editorOpen.set(false);
        this.showToast(id ? 'Updated' : 'Added');
        // First real to-do during the guided run → advance Pip's tour.
        if (!id) this.onboarding.reportTodoCreated();
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.formError.set(e?.error?.message || 'Something went wrong.');
      },
    });
  }

  complete(t: Todo) {
    // Optimistic
    this.patch(t.todoId, { status: 'done' });
    this.api.completeTodo(t.todoId).subscribe({
      next: (r) => this.showToast(`Done · +${r.earned ?? t.pointsValue} pts${t.goalId ? ' toward your goal' : ''}`),
      error: () => { this.patch(t.todoId, { status: 'open' }); this.showToast('Could not save — try again'); },
    });
  }

  reopen(t: Todo) {
    this.patch(t.todoId, { status: 'open' });
    this.api.reopenTodo(t.todoId).subscribe({
      error: () => { this.patch(t.todoId, { status: 'done' }); this.showToast('Could not save — try again'); },
    });
  }

  remove(t: Todo) {
    this.confirmDelete.set(null);
    const prev = this.todos();
    this.todos.set(prev.filter((x) => x.todoId !== t.todoId));
    this.api.deleteTodo(t.todoId).subscribe({
      next: () => this.showToast('Deleted'),
      error: () => { this.todos.set(prev); this.showToast('Could not delete — try again'); },
    });
  }

  private patch(id: string, fields: Partial<Todo>) {
    this.todos.set(this.todos().map((t) => (t.todoId === id ? { ...t, ...fields } : t)));
  }

  scheduleLabel(t: Todo): string {
    const d = (s: string | null) => (s ? new Date(s + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '');
    switch (t.schedule) {
      case 'date': return d(t.dueDate);
      case 'deadline': return t.dueDate ? 'by ' + d(t.dueDate) : '';
      case 'span': return `${d(t.startDate)}–${d(t.endDate)}`;
      default: return '';
    }
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
