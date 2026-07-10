import { Component, OnDestroy, OnInit, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ReminderBus } from '../core/reminder-bus.service';
import { NativeNotifyService } from '../core/native-notify.service';
import { SoundService } from '../core/sound.service';
import { Reminder } from '../core/models';
import { isBrowser } from '../core/platform';

// Global reminder host: pops the reminder dialog with NO polling.
//
// On load (and on tab focus / date rollover) it fetches TODAY's reminders once,
// caches them in localStorage, and schedules ONE setTimeout per reminder to its
// exact fire moment (using the server-computed absolute `nextFireAt`). When a
// timer fires the reminder is queued and shown one at a time. Snooze re-arms a
// fresh local timer (no server round-trip needed to keep nagging); Done
// acknowledges it. The server is only hit on load, on focus resync, and on the
// actual snooze/ack actions — never on a timer.
const CACHE_KEY = 'zenamaze.reminders.today';
const SNOOZE_PRESETS: { label: string; minutes: number }[] = [
  { label: '10 min', minutes: 10 },
  { label: '1 hour', minutes: 60 },
  { label: '3 hours', minutes: 180 },
  { label: 'Tomorrow', minutes: 24 * 60 },
];

@Component({
  selector: 'app-reminder-host',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (current(); as r) {
      <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div class="glass-strong w-full max-w-sm rounded-3xl p-6 animate-pop" role="alertdialog" aria-modal="true"
             [class.ring-2]="r.priority === 'high'" [class.ring-flame]="r.priority === 'high'">
          <div class="flex items-center gap-2 mb-3">
            <span class="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0"
                  [style.background-image]="r.priority === 'high' ? 'linear-gradient(135deg,#ff5c5c,#ff8f3f)' : 'linear-gradient(135deg,#7c5cff,#b64dff)'">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </span>
            <div class="min-w-0">
              <p class="text-micro uppercase tracking-wider" [class.text-flame]="r.priority === 'high'" [class.text-accent-soft]="r.priority !== 'high'">
                Reminder{{ r.priority === 'high' ? ' · Urgent' : '' }}
              </p>
              <p class="text-caption text-slate-400">{{ r.whenLabel }}{{ r.recurrence === 'custom' ? ' · ↻ every ' + r.intervalDays + ' days' : (r.recurrence !== 'none' ? ' · ↻ ' + r.recurrence : '') }}</p>
            </div>
          </div>

          <p class="text-white text-heading font-bold break-words mb-1">{{ r.title }}</p>
          @if (r.notes) { <p class="text-body-sm text-slate-300 break-words mb-4">{{ r.notes }}</p> } @else { <div class="mb-4"></div> }

          <p class="label mb-1.5">Snooze</p>
          <div class="flex flex-wrap gap-2 mb-4">
            @for (s of snoozePresets; track s.minutes) {
              <button class="chip hover:text-white hover:border-accent" [disabled]="acting()" (click)="snooze(r, s.minutes)">{{ s.label }}</button>
            }
          </div>

          <button class="btn-primary w-full" [disabled]="acting()" (click)="done(r)">
            {{ acting() ? 'Saving…' : '✓ Mark done' }}
          </button>
        </div>
      </div>
    }
  `,
})
export class ReminderHostComponent implements OnInit, OnDestroy {
  current = signal<Reminder | null>(null);
  acting = signal(false);

  snoozePresets = SNOOZE_PRESETS;

  private queue: Reminder[] = [];
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private handled = new Set<string>(); // acked this session — don't re-pop
  private cacheDate = '';
  private busSub?: Subscription;
  private onFocus = () => this.resync();
  private onVisible = () => { if (document.visibilityState === 'visible') this.resync(); };

  constructor(private api: ApiService, private auth: AuthService, private bus: ReminderBus, private native: NativeNotifyService, private sound: SoundService) {
    // React to auth state. The host is mounted once at bootstrap (often on the
    // login page, before auth). Without this, it would stay inert for the whole
    // session and reminders would only ever surface on a full reload. When the
    // user logs in, (re)start; on logout, tear the timers down.
    effect(() => {
      if (this.auth.isAuthed()) this.start();
      else this.stop();
    });
  }

  ngOnInit(): void {
    if (!isBrowser) return; // no timers/DOM listeners during prerender
    window.addEventListener('focus', this.onFocus);
    document.addEventListener('visibilitychange', this.onVisible);
    // A reminder created/edited elsewhere in the app → re-sync timers (foreground
    // dialog) and re-sync OS notifications (background/killed) now.
    this.busSub = this.bus.changed$.subscribe(() => { this.resync(); this.syncNative(); });
  }

  private start(): void {
    this.primeFromCache();
    this.resync();
    this.syncNative();
  }

  // Push ALL upcoming active reminders to the OS so they fire even when the app
  // isn't running (Android). No-op on web. Uses the full list (not just today)
  // so future-dated reminders are armed at the OS level too.
  private syncNative(): void {
    if (!this.native.isNative || !this.auth.isAuthed()) return;
    this.api.listReminders('active').subscribe({ next: (r) => this.native.sync(r.reminders || []) });
  }

  private stop(): void {
    this.sound.stopLoop('finish');
    this.clearTimers();
    this.queue = [];
    this.current.set(null);
    this.handled.clear();
  }

  ngOnDestroy(): void {
    this.clearTimers();
    this.busSub?.unsubscribe();
    if (!isBrowser) return;
    window.removeEventListener('focus', this.onFocus);
    document.removeEventListener('visibilitychange', this.onVisible);
  }

  private todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Persist one reminder's latest state into the same-day cache, so a reload
  // reschedules from the truth (e.g. a snooze's new moment) instead of a stale
  // past moment. Authoritative: fed from the API response, no ES-refresh race.
  private updateCache(r: Reminder): void {
    try {
      const today = this.todayStr();
      let arr: Reminder[] = [];
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const c = JSON.parse(raw) as { date: string; reminders: Reminder[] };
        if (c?.date === today && Array.isArray(c.reminders)) arr = c.reminders;
      }
      const i = arr.findIndex((x) => x.reminderId === r.reminderId);
      if (i >= 0) arr[i] = r; else arr.push(r);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ date: today, reminders: arr }));
    } catch { /* ignore */ }
  }

  // Schedule immediately from a same-day cache so a reload doesn't wait on the network.
  private primeFromCache(): void {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const cached = JSON.parse(raw) as { date: string; reminders: Reminder[] };
      if (cached?.date === this.todayStr() && Array.isArray(cached.reminders)) {
        this.cacheDate = cached.date;
        this.schedule(cached.reminders);
      }
    } catch { /* ignore corrupt cache */ }
  }

  // Map a shared project reminder into the Reminder shape the host schedules on.
  // Tagged __project so snooze/done route to the project endpoints. Uses
  // projectReminderId as reminderId (uuids — no collision with personal ones).
  private mapProject(r: any): Reminder {
    return { ...r, reminderId: r.projectReminderId, __project: true } as Reminder;
  }

  // Fetch today's PERSONAL reminders + the caller's ACTIVE project reminders
  // (shared, fire for all members) and (re)build timers over the union. Cheap:
  // called on load + focus + date rollover only — not on an interval.
  private resync(): void {
    if (!this.auth.isAuthed()) return;
    this.api.remindersForDay().subscribe({
      next: (res) => {
        this.cacheDate = this.todayStr();
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ date: this.cacheDate, reminders: res.reminders })); } catch {}
        // Then fold in shared project reminders and schedule the union together
        // (schedule() clears timers, so both sets must be passed at once).
        this.api.activeProjectReminders().subscribe({
          next: (pr) => this.schedule([...res.reminders, ...(pr.reminders || []).map((x) => this.mapProject(x))]),
          error: () => this.schedule(res.reminders),
        });
      },
      error: () => { /* stay on cached timers */ },
    });
  }

  private schedule(reminders: Reminder[]): void {
    this.clearTimers();
    for (const r of reminders) {
      if (r.status !== 'active' || r.doneToday || this.handled.has(r.reminderId)) continue;
      const delay = new Date(r.nextFireAt).getTime() - Date.now();
      if (delay <= 0) {
        this.enqueue(r);
      } else {
        // setTimeout is safe for intra-day delays; today's list never exceeds ~24h.
        this.timers.set(r.reminderId, setTimeout(() => { this.timers.delete(r.reminderId); this.enqueue(r); }, delay));
      }
    }
  }

  private clearTimers(): void {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
  }

  private enqueue(r: Reminder): void {
    if (this.handled.has(r.reminderId)) return;
    if (this.current()?.reminderId === r.reminderId) return;
    if (this.queue.some((x) => x.reminderId === r.reminderId)) return;
    this.queue.push(r);
    this.showNext();
  }

  private showNext(): void {
    if (this.current() || this.queue.length === 0) return;
    // Most urgent first: high priority, then soonest.
    this.queue.sort((a, b) => this.rank(b) - this.rank(a) || new Date(a.nextFireAt).getTime() - new Date(b.nextFireAt).getTime());
    this.current.set(this.queue.shift()!);
    this.sound.startLoop('finish'); // persistent alarm until user acts — same cue as the focus timer
  }

  private rank(r: Reminder): number {
    return r.priority === 'high' ? 3 : r.priority === 'low' ? 1 : 2;
  }

  private dismiss(): void {
    this.sound.stopLoop('finish'); // silence the alarm once the user snoozes/acks
    this.current.set(null);
    this.acting.set(false);
    setTimeout(() => this.showNext(), 150);
  }

  snooze(r: Reminder, minutes: number): void {
    if (this.acting()) return;
    this.acting.set(true);
    const req: any = (r as any).__project
      ? this.api.snoozeProjectReminder(r.reminderId, minutes)
      : this.api.snoozeReminder(r.reminderId, minutes);
    req.subscribe({
      next: (res: any) => {
        // Persist the new moment so a reload doesn't re-pop it, and re-arm a
        // fresh local timer for it (no polling). Normalize project reminders.
        const rem: Reminder = (r as any).__project ? this.mapProject(res.reminder) : res.reminder;
        this.updateCache(rem);
        const delay = new Date(rem.nextFireAt).getTime() - Date.now();
        if (delay > 0) {
          this.timers.set(r.reminderId, setTimeout(() => { this.timers.delete(r.reminderId); this.enqueue(rem); }, delay));
        }
        this.syncNative();
        this.dismiss();
      },
      error: () => this.acting.set(false),
    });
  }

  done(r: Reminder): void {
    if (this.acting()) return;
    this.acting.set(true);
    this.handled.add(r.reminderId);
    const t = this.timers.get(r.reminderId);
    if (t) { clearTimeout(t); this.timers.delete(r.reminderId); }
    const req: any = (r as any).__project ? this.api.ackProjectReminder(r.reminderId) : this.api.ackReminder(r.reminderId);
    req.subscribe({
      next: (res: any) => { const rem: Reminder = (r as any).__project ? this.mapProject(res.reminder) : res.reminder; this.updateCache(rem); this.syncNative(); this.dismiss(); },
      error: () => { this.handled.delete(r.reminderId); this.acting.set(false); },
    });
  }
}
