import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Analysis, AnalysisDay, AnalysisDayDetail, AnalysisMeme, DayStatus } from '../../core/models';
import { memegenUrl } from '../../shared/meme';
import { RoastLevelSwitcherComponent } from '../../shared/roast-level-switcher.component';

interface Cell {
  date: string | null; // null = leading pad cell
  day: number;
  status: DayStatus | 'none';
  done: number;
  total: number;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WD_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [CommonModule, RouterLink, RoastLevelSwitcherComponent],
  template: `
    <div>
      <ng-container *ngIf="data() as d; else loadingTpl">

        <!-- Zenamaze roast -->
        <div class="glass-strong relative p-4 md:p-5 mb-5 animate-fade-up flex items-start gap-3"
             [class.z-40]="rls.open()"
             [ngClass]="{
               'border-gold/40': tone() === 'good',
               'border-accent/40': tone() === 'mid',
               'border-flame/40': tone() === 'bad'
             }">
          <img src="icon.svg" alt="" class="h-9 w-9 md:h-10 md:w-10 shrink-0 rounded-full object-cover shadow-glow">
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2 mb-1">
              <p class="text-micro uppercase tracking-wider"
                 [ngClass]="{ 'text-gold': tone() === 'good', 'text-accent-soft': tone() === 'mid', 'text-flame': tone() === 'bad' }">Zenamaze</p>
              <app-roast-level-switcher #rls (changed)="load()"></app-roast-level-switcher>
            </div>
            <p class="text-body-sm md:text-body text-slate-100 leading-snug">{{ d.roast }}</p>
          </div>
        </div>

        <!-- Meme of the day — just the image (memegen bakes the caption in) -->
        <div class="rounded-2xl overflow-hidden mb-5 animate-fade-up border border-white/10">
          <div class="flex items-center justify-center bg-black">
            <img *ngIf="memeImg() && !memeImgFailed(); else memeEmojiBig" [src]="memeImg()" (error)="memeImgFailed.set(true)"
                 [alt]="meme().template || 'meme'" loading="lazy" class="max-h-80 w-auto object-contain" />
            <ng-template #memeEmojiBig>
              <div class="py-12 px-4 text-center">
                <span class="text-7xl leading-none">{{ meme().emoji }}</span>
                <p class="text-slate-300 text-body-sm mt-3">{{ meme().top }} — {{ meme().bottom }}</p>
              </div>
            </ng-template>
          </div>
          <p class="text-micro text-slate-500 text-center py-1.5 bg-black/30">{{ meme().template ? 'meme: ' + meme().template : 'meme of the day · your track record, dramatized' }}</p>
        </div>

        <!-- Headline stats -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 animate-fade-up">
          <div class="card p-3 md:p-4 text-center">
            <div class="text-stat font-extrabold stat-number"
                 [ngClass]="d.summary.completionRate >= 70 ? 'text-gold' : d.summary.completionRate >= 40 ? 'text-white' : 'text-flame'">{{ d.summary.completionRate }}%</div>
            <p class="text-caption text-slate-400 mt-1">completion</p>
          </div>
          <div class="card p-3 md:p-4 text-center">
            <div class="text-stat font-extrabold text-flame flex items-center justify-center gap-1 stat-number">{{ d.summary.currentStreak }} <span class="text-base">🔥</span></div>
            <p class="text-caption text-slate-400 mt-1">current streak</p>
          </div>
          <div class="card p-3 md:p-4 text-center">
            <div class="text-stat font-extrabold text-gold flex items-center justify-center gap-1 stat-number">{{ d.summary.bestStreak }} <span class="text-base">🏆</span></div>
            <p class="text-caption text-slate-400 mt-1">best streak</p>
          </div>
          <div class="card p-3 md:p-4 text-center">
            <div class="text-stat font-extrabold text-white stat-number">{{ d.summary.perfectDays }}</div>
            <p class="text-caption text-slate-400 mt-1">perfect days</p>
          </div>
        </div>

        <!-- Secondary stat chips -->
        <div class="flex flex-wrap gap-2 mb-6 animate-fade-up">
          <span class="chip text-accent-soft border-accent/30">{{ d.summary.partialDays }} partial days</span>
          <span class="chip text-flame border-flame/30">{{ d.summary.zeroDays }} zero days</span>
          <span class="chip text-slate-300">📈 {{ d.summary.momentum }} momentum</span>
          <span class="chip text-slate-300">{{ d.summary.activeDays }} active days</span>
        </div>

        <ng-container *ngIf="d.summary.activeDays > 0; else emptyTpl">

          <!-- Calendar -->
          <section class="glass p-4 md:p-5 mb-6 animate-fade-up">
            <div class="flex items-center justify-between mb-4">
              <button class="h-8 w-8 rounded-full flex items-center justify-center text-slate-300 disabled:opacity-30 hover:bg-white/5"
                      (click)="prevMonth()" [disabled]="!canPrev()" aria-label="Previous month">←</button>
              <h2 class="text-heading text-white">{{ monthLabel() }}</h2>
              <button class="h-8 w-8 rounded-full flex items-center justify-center text-slate-300 disabled:opacity-30 hover:bg-white/5"
                      (click)="nextMonth()" [disabled]="!canNext()" aria-label="Next month">→</button>
            </div>

            <div class="grid grid-cols-7 gap-1.5 mb-1.5">
              <div *ngFor="let w of weekdayHeaders; let i = index" class="text-center text-micro text-slate-500">{{ w }}</div>
            </div>
            <div class="grid grid-cols-7 gap-1.5">
              <button *ngFor="let c of monthCells()" type="button"
                   [disabled]="!c.date"
                   (click)="openDay(c)"
                   class="aspect-square rounded-lg flex items-center justify-center text-caption relative transition-transform focus:outline-none focus:ring-2 focus:ring-accent/70"
                   [class.cursor-pointer]="!!c.date"
                   [class.hover:scale-105]="!!c.date"
                   [attr.title]="cellTitle(c)"
                   [ngClass]="{
                     'invisible pointer-events-none': !c.date,
                     'bg-emerald-500 text-white font-semibold shadow-sm': c.status === 'done',
                     'bg-amber-400 text-amber-950 font-semibold shadow-sm': c.status === 'partial',
                     'bg-rose-500 text-white font-semibold shadow-sm': c.status === 'missed',
                     'bg-transparent ring-2 ring-accent text-slate-700 dark:text-white font-semibold animate-pulse-glow': c.status === 'today',
                     'bg-black/[0.04] dark:bg-white/5 text-slate-400': c.status === 'none'
                   }">{{ c.day }}</button>
            </div>

            <!-- Legend -->
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-4">
              <span class="inline-flex items-center gap-1.5 text-micro text-slate-400"><span class="h-2.5 w-2.5 rounded bg-emerald-500"></span>All done</span>
              <span class="inline-flex items-center gap-1.5 text-micro text-slate-400"><span class="h-2.5 w-2.5 rounded bg-amber-400"></span>Partial</span>
              <span class="inline-flex items-center gap-1.5 text-micro text-slate-400"><span class="h-2.5 w-2.5 rounded bg-rose-500"></span>Nothing</span>
              <span class="inline-flex items-center gap-1.5 text-micro text-slate-400"><span class="h-2.5 w-2.5 rounded ring-2 ring-accent"></span>Today</span>
            </div>
            <p class="text-micro text-slate-500 mt-2">Tap any day to see what you finished — and what you dodged.</p>
          </section>

          <!-- Last 30 active days trend -->
          <section class="glass p-4 md:p-5 mb-6 animate-fade-up">
            <h2 class="text-heading text-white mb-1">Recent trend</h2>
            <p class="text-caption text-slate-400 mb-4">Daily completion across your last {{ last30().length }} active days.</p>
            <div class="flex items-end gap-1 h-32">
              <div *ngFor="let b of last30()" class="flex-1 min-w-0 flex flex-col justify-end h-full"
                   [attr.title]="cellTitle(dayToCell(b))">
                <div class="rounded-t transition-all"
                     [style.height.%]="barPct(b)"
                     [ngClass]="{
                       'bg-emerald-500': b.status === 'done',
                       'bg-amber-400': b.status === 'partial',
                       'bg-rose-500': b.status === 'missed',
                       'bg-accent ring-1 ring-accent': b.status === 'today'
                     }"></div>
              </div>
            </div>
          </section>

          <!-- Weekday breakdown -->
          <section class="glass p-4 md:p-5 mb-6 animate-fade-up">
            <h2 class="text-heading text-white mb-1">Your weekdays</h2>
            <p class="text-caption text-slate-400 mb-4">Completion rate by day of the week — spot the day you keep slacking.</p>
            <div class="flex items-end gap-2 h-28 mb-2">
              <div *ngFor="let w of data()!.weekday" class="flex-1 flex flex-col justify-end h-full">
                <div class="rounded-t transition-all" [style.height.%]="w.total ? w.rate : 2"
                     [ngClass]="w.total ? (w.rate >= 70 ? 'bg-emerald-500' : w.rate >= 40 ? 'bg-amber-400' : 'bg-rose-500') : 'bg-black/10 dark:bg-white/10'"
                     [attr.title]="wdFull[w.day] + ': ' + (w.total ? w.rate + '% done' : 'no data')"></div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div *ngFor="let w of data()!.weekday" class="flex-1 text-center text-micro text-slate-500">{{ wd[w.day] }}</div>
            </div>
          </section>

        </ng-container>

        <ng-template #emptyTpl>
          <div class="card p-8 text-center animate-fade-up">
            <p class="text-4xl mb-3">🫥</p>
            <p class="text-white font-semibold mb-1">No history to analyze yet</p>
            <p class="text-body-sm text-slate-400 mb-4">Complete a few days of tasks and this page fills with your calendar, trends — and Zenamaze's opinions.</p>
            <a routerLink="/dashboard" class="btn-primary inline-flex">Go do today's tasks</a>
          </div>
        </ng-template>

      </ng-container>

      <ng-template #loadingTpl>
        <div class="py-20 flex justify-center"><div class="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin"></div></div>
      </ng-template>
    </div>

    <!-- Day detail -->
    <div *ngIf="selectedDate() as sd" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
         (click)="closeDay()" (keydown.escape)="closeDay()" tabindex="-1">
      <div class="glass-strong w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto"
           role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
        <div class="flex items-start justify-between mb-3">
          <div>
            <h2 class="text-heading text-white font-bold">{{ prettyDate(sd) }}</h2>
            <p *ngIf="dayDetail() as dd" class="text-caption text-slate-400 mt-0.5">
              {{ dd.ratioTotal ? dd.doneCount + '/' + dd.ratioTotal + ' finished' : (dd.total ? dd.total + ' tasks' : 'nothing tracked') }}
            </p>
          </div>
          <button class="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5" (click)="closeDay()" aria-label="Close">✕</button>
        </div>

        <div *ngIf="dayLoading()" class="py-10 flex justify-center"><div class="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin"></div></div>

        <ng-container *ngIf="!dayLoading() && dayDetail() as dd">
          <div *ngIf="dd.total === 0" class="py-8 text-center">
            <p class="text-3xl mb-2">🌫️</p>
            <p class="text-slate-300 text-body-sm">No tasks were scheduled this day. Ghost town.</p>
          </div>

          <!-- Done -->
          <div *ngIf="dd.done.length" class="mb-4">
            <p class="text-micro uppercase tracking-wider text-emerald-400 mb-2">✅ Crushed it ({{ dd.done.length }})</p>
            <div class="space-y-1.5">
              <div *ngFor="let t of dd.done" class="flex items-center gap-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                <span class="text-emerald-400">✓</span>
                <span class="text-body-sm text-white flex-1 min-w-0 break-words">{{ t.title }}</span>
                <span *ngIf="t.estMinutes" class="text-micro text-slate-400 shrink-0">{{ t.estMinutes }}m</span>
              </div>
            </div>
          </div>

          <!-- Procrastinated -->
          <div *ngIf="dd.procrastinated.length" class="mb-4">
            <p class="text-micro uppercase tracking-wider text-rose-400 mb-2">🙈 Procrastinated ({{ dd.procrastinated.length }})</p>
            <div class="space-y-1.5">
              <div *ngFor="let t of dd.procrastinated" class="flex items-center gap-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2">
                <span class="text-rose-400">✕</span>
                <span class="text-body-sm text-white flex-1 min-w-0 break-words">{{ t.title }}</span>
                <span class="text-micro shrink-0" [ngClass]="t.reason === 'postponed' ? 'text-accent-soft' : 'text-rose-300'">{{ t.reason === 'postponed' ? 'moved' : 'skipped' }}</span>
              </div>
            </div>
          </div>

          <!-- Pending (today, still open) -->
          <div *ngIf="dd.pending.length" class="mb-1">
            <p class="text-micro uppercase tracking-wider text-amber-400 mb-2">⏳ Still on the clock ({{ dd.pending.length }})</p>
            <div class="space-y-1.5">
              <div *ngFor="let t of dd.pending" class="flex items-center gap-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20 px-3 py-2">
                <span class="text-amber-400">○</span>
                <span class="text-body-sm text-white flex-1 min-w-0 break-words">{{ t.title }}</span>
              </div>
            </div>
          </div>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    /* Classic Impact-meme caption: heavy, uppercase, white with a black outline. */
    .meme-text {
      text-align: center;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      line-height: 1.05;
      color: #fff;
      font-size: clamp(0.85rem, 3.4vw, 1.35rem);
      text-shadow: -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 2px 4px rgba(0,0,0,.6);
    }
  `],
})
export class AnalysisComponent implements OnInit {
  data = signal<Analysis | null>(null);
  loading = signal(true);
  viewYear = signal(new Date().getFullYear());
  viewMonth = signal(new Date().getMonth());

  weekdayHeaders = WD;
  wd = WD;
  wdFull = WD_FULL;

  private map = new Map<string, AnalysisDay>();

  // Bucket the overall record into a tone so the roast card colors match the mood.
  tone = computed<'good' | 'mid' | 'bad'>(() => {
    const r = this.data()?.summary.completionRate ?? 0;
    return r >= 70 ? 'good' : r >= 40 ? 'mid' : 'bad';
  });

  last30 = computed<AnalysisDay[]>(() => (this.data()?.days || []).slice(-30));

  // Meme keyed to how you're doing. Prefer the server's localized meme (in the
  // user's language); fall back to local English/brainrot sets if absent.
  meme = computed<AnalysisMeme>(() => {
    const srv = this.data()?.meme;
    if (srv && (srv.top || srv.bottom)) return srv;
    const s = this.data()?.summary;
    const sets: Record<'good' | 'mid' | 'bad', { top: string; bottom: string; emoji: string }[]> = {
      good: [
        { emoji: '🗿', top: 'nobody:', bottom: 'you clearing every task like a final boss' },
        { emoji: '😎', top: 'them: how are you this consistent?', bottom: 'you: i simply do the tasks 💅' },
        { emoji: '🔥', top: 'your streak:', bottom: 'still standing, unbothered, thriving' },
      ],
      mid: [
        { emoji: '🥴', top: 'me: i\'ll finish it all tomorrow', bottom: 'tomorrow: absolutely not' },
        { emoji: '📉', top: 'started the week strong', bottom: 'motivation has left the chat' },
        { emoji: '🫠', top: 'half the tasks done', bottom: 'the other half: crying in the corner' },
      ],
      bad: [
        { emoji: '🤡', top: 'your to-do list watching you', bottom: 'open the app and do nothing again' },
        { emoji: '💀', top: 'me: i work best under pressure', bottom: 'the pressure: *right there* me: 🛌' },
        { emoji: '🍃', top: 'your tasks:', bottom: 'gone. reduced to atoms.' },
      ],
    };
    const t = this.tone();
    const arr = sets[t];
    const seed = s ? s.perfectDays + s.partialDays + s.zeroDays : 0;
    return arr[seed % arr.length];
  });

  // Real meme image (memegen) for the current meme; hidden if it fails to load.
  memeImg = computed(() => memegenUrl(this.meme()));
  memeImgFailed = signal(false);

  // First and last month that have data, as YYYY*12+M ordinals, to clamp nav.
  private firstOrd = computed(() => {
    const days = this.data()?.days || [];
    if (!days.length) return this.ordOf(this.today());
    return this.ordOf(days[0].date);
  });
  private lastOrd = computed(() => this.ordOf(this.data()?.today || this.today()));
  private viewOrd = computed(() => this.viewYear() * 12 + this.viewMonth());

  canPrev = computed(() => this.viewOrd() > this.firstOrd());
  canNext = computed(() => this.viewOrd() < this.lastOrd());

  monthLabel = computed(() => `${MONTHS[this.viewMonth()]} ${this.viewYear()}`);

  monthCells = computed<Cell[]>(() => {
    const y = this.viewYear();
    const m = this.viewMonth();
    const todayStr = this.data()?.today || this.today();
    const first = new Date(y, m, 1).getDay(); // 0 Sun
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: Cell[] = [];
    for (let i = 0; i < first; i++) cells.push({ date: null, day: 0, status: 'none', done: 0, total: 0 });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const rec = this.map.get(date);
      let status: DayStatus | 'none';
      if (rec) status = rec.status;
      else status = date === todayStr ? 'today' : 'none';
      cells.push({ date, day: d, status, done: rec?.done ?? 0, total: rec?.total ?? 0 });
    }
    return cells;
  });

  selectedDate = signal<string | null>(null);
  dayDetail = signal<AnalysisDayDetail | null>(null);
  dayLoading = signal(false);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  // Open the drill-down for a calendar cell and fetch that day's task breakdown.
  openDay(c: Cell) {
    if (!c.date) return;
    this.selectedDate.set(c.date);
    this.dayDetail.set(null);
    this.dayLoading.set(true);
    this.api.analysisDay(c.date).subscribe({
      next: (d) => { this.dayDetail.set(d); this.dayLoading.set(false); },
      error: () => this.dayLoading.set(false),
    });
  }

  closeDay() {
    this.selectedDate.set(null);
    this.dayDetail.set(null);
  }

  prettyDate(date: string): string {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  load() {
    this.loading.set(true);
    this.memeImgFailed.set(false);
    this.api.analysis().subscribe({
      next: (a) => {
        this.map = new Map(a.days.map((d) => [d.date, d]));
        this.data.set(a);
        // Open on the most recent month that has data (today's month).
        const [ty, tm] = a.today.split('-').map(Number);
        this.viewYear.set(ty);
        this.viewMonth.set(tm - 1);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private today(): string {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }

  private ordOf(date: string): number {
    const [y, m] = date.split('-').map(Number);
    return y * 12 + (m - 1);
  }

  prevMonth() {
    if (!this.canPrev()) return;
    let m = this.viewMonth() - 1;
    let y = this.viewYear();
    if (m < 0) { m = 11; y -= 1; }
    this.viewMonth.set(m);
    this.viewYear.set(y);
  }

  nextMonth() {
    if (!this.canNext()) return;
    let m = this.viewMonth() + 1;
    let y = this.viewYear();
    if (m > 11) { m = 0; y += 1; }
    this.viewMonth.set(m);
    this.viewYear.set(y);
  }

  // Bar height for the recent-trend chart: completion ratio, min 4% so a zero day
  // still shows a sliver of flame.
  barPct(d: AnalysisDay): number {
    if (!d.total) return 4;
    return Math.max(4, Math.round((d.done / d.total) * 100));
  }

  dayToCell(d: AnalysisDay): Cell {
    return { date: d.date, day: 0, status: d.status, done: d.done, total: d.total };
  }

  cellTitle(c: Cell): string {
    if (!c.date) return '';
    const label =
      c.status === 'done' ? 'all done' :
      c.status === 'partial' ? `${c.done}/${c.total} done` :
      c.status === 'missed' ? 'nothing done' :
      c.status === 'today' ? 'today' : 'no tasks';
    return `${c.date} — ${label}`;
  }
}
