import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { GoalSummary, Note, NoteColor, NoteFont, NoteInput } from '../../core/models';
import { BottomNavComponent } from '../../shared/bottom-nav.component';
import { TopBarComponent } from '../../shared/top-bar.component';

// Local editor form — plain strings so it binds cleanly to inputs; mapped to the
// nullable API shape in buildPayload().
interface NoteForm {
  title: string;
  body: string;
  color: NoteColor;
  font: NoteFont;
  pinned: boolean;
  goalId: string | null;
}

// Sticky notes — plain things to remember. No dates, no reminders, no points.
// A note has an optional title, a text body, a color, and a pin-to-top flag.
// Pinned notes sort first and also surface on the dashboard.
@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BottomNavComponent, TopBarComponent],
  template: `
    <app-top-bar></app-top-bar>

    <div class="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto w-full px-4 md:px-6 lg:px-8 pt-6 md:pt-8 lg:pt-10 pb-10">
      <div class="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <a routerLink="/dashboard" class="text-body-sm text-slate-400 hover:text-white mb-1 inline-block">← Today</a>
          <h1 class="text-display md:text-display-lg gradient-text">Notes</h1>
        </div>
        <button class="btn-primary text-sm !py-2 shrink-0" (click)="openCreate()">+ New</button>
      </div>

      @if (loading()) {
        <div class="py-20 flex justify-center"><div class="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin"></div></div>
      } @else {
        @if (notes().length === 0) {
          <div class="glass p-8 text-center animate-fade-up">
            <p class="text-4xl mb-3">🗒️</p>
            <p class="text-white font-semibold mb-1">No notes yet</p>
            <p class="text-body-sm text-slate-400 mb-4">Jot down anything you want to remember — a password hint, an idea, a list. Pin the important ones.</p>
            <button class="btn-primary text-sm !py-2" (click)="openCreate()">Add your first note</button>
          </div>
        } @else {
          @if (pinnedList().length) {
            <section class="mb-6 animate-fade-up">
              <h2 class="text-micro uppercase tracking-wider text-accent-soft mb-2">📌 Pinned</h2>
              @for (n of pinnedList(); track n.noteId) {
                <ng-container [ngTemplateOutlet]="row" [ngTemplateOutletContext]="{ $implicit: n }"></ng-container>
              }
            </section>
          }
          @if (otherList().length) {
            <section class="mb-6 animate-fade-up">
              @if (pinnedList().length) { <h2 class="text-micro uppercase tracking-wider text-slate-400 mb-2">All notes</h2> }
              @for (n of otherList(); track n.noteId) {
                <ng-container [ngTemplateOutlet]="row" [ngTemplateOutletContext]="{ $implicit: n }"></ng-container>
              }
            </section>
          }
        }
      }
    </div>

    <!-- Reusable note row — colored paper sticky, so the note reads like its color. -->
    <ng-template #row let-n>
      <div class="rounded-2xl p-4 mb-2.5 flex items-start gap-3 border shadow-card" [ngClass]="paperClass(n.color)">
        <div class="min-w-0 flex-1" [ngClass]="fontClass(n.font)">
          @if (n.title) { <p class="text-black/85 font-bold break-words">{{ n.title }}</p> }
          @if (n.body) { <p class="text-black/70 mt-0.5 whitespace-pre-wrap break-words">{{ n.body }}</p> }
          @if (n.goalId) {
            <div class="mt-1.5"><span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption border border-black/15 text-black/60 bg-black/5">🎯 {{ goalTitle(n.goalId) }}</span></div>
          }
        </div>
        <div class="flex flex-col items-end gap-1 shrink-0">
          <button class="text-caption" [ngClass]="n.pinned ? 'text-black/80 font-semibold' : 'text-black/40 hover:text-black/70'" (click)="togglePin(n)" [attr.aria-label]="n.pinned ? 'Unpin' : 'Pin'">{{ n.pinned ? '📌 Pinned' : 'Pin' }}</button>
          <button class="text-caption text-black/45 hover:text-black/75" (click)="openEdit(n)">Edit</button>
          <button class="text-caption text-black/40 hover:text-red-600" (click)="confirmDelete.set(n)">Delete</button>
        </div>
      </div>
    </ng-template>

    <!-- Create / edit modal -->
    @if (editorOpen()) {
      <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" (click)="closeEditor()">
        <div class="glass-strong w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <div class="p-5 overflow-y-auto flex-1">
          <h2 class="text-heading text-white font-bold mb-4">{{ editingId() ? 'Edit note' : 'New note' }}</h2>

          <label class="label">Title <span class="text-slate-500">(optional)</span></label>
          <input class="input mb-3" [(ngModel)]="form.title" placeholder="Short heading" />

          <label class="label">Note</label>
          <textarea class="input resize-none mb-3" rows="4" [(ngModel)]="form.body" placeholder="What do you want to remember?"></textarea>

          <label class="label">Color</label>
          <div class="flex gap-2 mb-3">
            @for (c of colors; track c) {
              <button type="button" class="h-8 w-8 rounded-full border-2 transition-all" [ngClass]="swatchClass(c)" [class.ring-2]="form.color === c" [class.ring-white]="form.color === c" (click)="form.color = c" [attr.aria-label]="c"></button>
            }
          </div>

          <label class="label">Font</label>
          <div class="grid grid-cols-2 gap-2 mb-3">
            @for (f of fonts; track f.key) {
              <button type="button" class="px-3 py-2.5 rounded-xl border text-left transition-all"
                      [ngClass]="form.font === f.key ? 'border-accent bg-accent/10' : 'border-white/10 hover:border-white/25'"
                      (click)="form.font = f.key">
                <span class="text-lg text-white" [ngClass]="fontClass(f.key)">{{ f.label }}</span>
              </button>
            }
          </div>

          <label class="label">Pin</label>
          <div class="flex gap-2 mb-3">
            <button type="button" class="chip" [class.border-accent]="form.pinned" [class.text-white]="form.pinned" (click)="form.pinned = true">📌 Pinned</button>
            <button type="button" class="chip" [class.border-accent]="!form.pinned" [class.text-white]="!form.pinned" (click)="form.pinned = false">Unpinned</button>
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
            <button class="btn-primary text-sm !py-2" (click)="save()" [disabled]="saving() || (!form.title.trim() && !form.body.trim())">
              {{ saving() ? 'Saving…' : (editingId() ? 'Save' : 'Add note') }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Delete confirm -->
    @if (confirmDelete(); as n) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" (click)="confirmDelete.set(null)">
        <div class="glass-strong w-full max-w-sm rounded-3xl p-5" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <p class="text-white font-semibold mb-1">Delete this note?</p>
          <p class="text-body-sm text-slate-400 mb-4 break-words">"{{ n.title || n.body }}" will be removed.</p>
          <div class="flex gap-2 justify-end">
            <button class="btn-ghost text-sm !py-2" (click)="confirmDelete.set(null)">Cancel</button>
            <button class="btn-primary text-sm !py-2 !bg-flame" (click)="remove(n)">Delete</button>
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
export class NotesComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  notes = signal<Note[]>([]);
  goals = signal<GoalSummary[]>([]);

  editorOpen = signal(false);
  editingId = signal<string | null>(null);
  formError = signal<string | null>(null);
  confirmDelete = signal<Note | null>(null);
  toast = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  colors: NoteColor[] = ['yellow', 'blue', 'green', 'pink'];
  fonts: { key: NoteFont; label: string }[] = [
    { key: 'sans', label: 'Clean' },
    { key: 'hand', label: 'Handwritten' },
    { key: 'marker', label: 'Marker' },
    { key: 'serif', label: 'Elegant' },
  ];
  form: NoteForm = this.blankForm();

  // Pinned first, then the rest (the API already returns them pinned-first).
  pinnedList = computed(() => this.notes().filter((n) => n.pinned));
  otherList = computed(() => this.notes().filter((n) => !n.pinned));

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.load();
    this.api.listGoals().subscribe({ next: (r) => this.goals.set(r.goals || []) });
    // Opened from the dashboard "+" chooser → jump straight into create.
    if (this.route.snapshot.queryParamMap.get('new')) this.openCreate();
  }

  load() {
    this.loading.set(true);
    this.api.listNotes().subscribe({
      next: (r) => {
        this.notes.set(r.notes || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private blankForm(): NoteForm {
    return { title: '', body: '', color: 'yellow', font: 'sans', pinned: false, goalId: null };
  }

  openCreate() {
    this.form = this.blankForm();
    this.editingId.set(null);
    this.formError.set(null);
    this.editorOpen.set(true);
  }

  openEdit(n: Note) {
    this.form = { title: n.title || '', body: n.body || '', color: n.color, font: n.font || 'sans', pinned: n.pinned, goalId: n.goalId };
    this.editingId.set(n.noteId);
    this.formError.set(null);
    this.editorOpen.set(true);
  }

  closeEditor() {
    this.editorOpen.set(false);
  }

  private buildPayload(): NoteInput | null {
    const title = this.form.title.trim();
    const body = this.form.body.trim();
    if (!title && !body) { this.formError.set('Add a title or some text.'); return null; }
    return { title: title || null, body, color: this.form.color, font: this.form.font, pinned: this.form.pinned, goalId: this.form.goalId || null };
  }

  save() {
    this.formError.set(null);
    const payload = this.buildPayload();
    if (!payload || this.saving()) return;
    this.saving.set(true);
    const id = this.editingId();
    const req = id ? this.api.updateNote(id, payload) : this.api.createNote(payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.editorOpen.set(false);
        this.showToast(id ? 'Updated' : 'Added');
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.formError.set(e?.error?.message || 'Something went wrong.');
      },
    });
  }

  togglePin(n: Note) {
    const next = !n.pinned;
    this.patch(n.noteId, { pinned: next });
    // Keep pinned-first ordering after an optimistic toggle.
    this.notes.set([...this.notes()].sort(this.byPinned));
    this.api.updateNote(n.noteId, { pinned: next }).subscribe({
      next: () => this.showToast(next ? 'Pinned' : 'Unpinned'),
      error: () => { this.patch(n.noteId, { pinned: !next }); this.notes.set([...this.notes()].sort(this.byPinned)); this.showToast('Could not save — try again'); },
    });
  }

  remove(n: Note) {
    this.confirmDelete.set(null);
    const prev = this.notes();
    this.notes.set(prev.filter((x) => x.noteId !== n.noteId));
    this.api.deleteNote(n.noteId).subscribe({
      next: () => this.showToast('Deleted'),
      error: () => { this.notes.set(prev); this.showToast('Could not delete — try again'); },
    });
  }

  private byPinned = (a: Note, b: Note) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
  };

  private patch(id: string, fields: Partial<Note>) {
    this.notes.set(this.notes().map((n) => (n.noteId === id ? { ...n, ...fields } : n)));
  }

  goalTitle(goalId: string): string {
    const g = this.goals().find((x) => x.goalId === goalId);
    return g ? g.title : 'Goal';
  }

  // Colored-paper background per note color — the whole card reads as its color
  // (dark text set in the template). Full literal strings so Tailwind keeps them.
  paperClass(color: NoteColor): string {
    switch (color) {
      case 'blue': return 'bg-sky-100 border-sky-300';
      case 'green': return 'bg-emerald-100 border-emerald-300';
      case 'pink': return 'bg-pink-100 border-pink-300';
      default: return 'bg-amber-100 border-amber-300';
    }
  }

  // Typeface for the note body — handwritten/marker fonts bump size a touch so
  // they read naturally. Full literal strings so Tailwind keeps them.
  fontClass(font: NoteFont | undefined): string {
    switch (font) {
      case 'hand': return 'font-hand text-xl leading-tight';
      case 'marker': return 'font-marker tracking-wide';
      case 'serif': return 'font-display text-lg';
      default: return 'font-sans';
    }
  }

  swatchClass(color: NoteColor): string {
    switch (color) {
      case 'blue': return 'bg-sky-400 border-sky-300';
      case 'green': return 'bg-emerald-400 border-emerald-300';
      case 'pink': return 'bg-pink-400 border-pink-300';
      default: return 'bg-amber-300 border-amber-200';
    }
  }

  private showToast(msg: string) {
    this.toast.set(msg);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 2600);
  }
}
