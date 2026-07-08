import { Component, Input, Output, EventEmitter, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task } from '../core/models';
import { ApiService } from '../core/api.service';
import { SoundService } from '../core/sound.service';
import { MotivationQuoteComponent } from './motivation-quote.component';
import confetti from 'canvas-confetti';

@Component({
  selector: 'app-focus-timer',
  standalone: true,
  imports: [CommonModule, MotivationQuoteComponent],
  template: `
    <div class="focus-timer fixed inset-0 z-50 flex items-center justify-center bg-black px-4"
         [class.animate-fade-up]="true">

      <!-- Mode choice -->
      @if (state() === 'choosing') {
        <div class="p-8 w-full max-w-md text-center animate-fade-up rounded-3xl border border-white/10"
             style="background:#121318;">
          <div class="h-16 w-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
               style="background-image:linear-gradient(135deg,#7c5cff,#b64dff)">
            🎯
          </div>
          <h2 class="text-heading-xl text-white mb-2">Focus mode</h2>
          <p class="text-body text-slate-100 mb-1">"{{ task.title }}"</p>
          @if (spentMinutes() > 0) {
            <p class="text-body-sm text-accent-soft mb-6">
              {{ spentMinutes() }} min done · {{ leftMinutes() }} min left
            </p>
          } @else {
            <p class="text-body-sm text-slate-300 mb-6">{{ totalMinutes }} min</p>
          }

          <div class="space-y-3">
            <button (click)="start(true)"
                    class="btn-primary w-full text-body !py-4">
              🔒 Yes — lock me in
            </button>
            <p class="text-body-sm text-slate-200 -mt-1.5 mb-3">Timer pauses if you leave this tab</p>

            <button (click)="start(false)"
                    class="btn-ghost w-full text-body !py-4">
              ⏱ No — keep running
            </button>
            <p class="text-body-sm text-slate-200 -mt-1.5">Counts down in background too</p>
          </div>

          <button (click)="cancel()" class="text-body-sm text-slate-300 hover:text-white mt-6">Cancel</button>
        </div>
      }

      <!-- Timer view -->
      @if (state() === 'running' || state() === 'finished' || state() === 'overtime') {
        <div class="flex flex-col items-center animate-fade-up">
          <!-- Header: mute toggle + close -->
          <div class="w-full max-w-sm flex justify-end items-center gap-2 mb-4">
            <button (click)="sound.toggleMute()"
                    [attr.aria-label]="sound.muted() ? 'Unmute sounds' : 'Mute sounds'"
                    class="h-9 w-9 rounded-full bg-white/20 border border-white/20 flex items-center justify-center text-slate-200 hover:text-white hover:bg-white/30 transition-all">
              {{ sound.muted() ? '🔇' : '🔊' }}
            </button>
            <button (click)="confirmCancel()"
                    class="h-9 w-9 rounded-full bg-white/20 border border-white/20 flex items-center justify-center text-slate-200 hover:text-white hover:bg-white/30 transition-all">
              ✕
            </button>
          </div>

          <!-- Mode badge -->
          <span class="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/15 px-4 py-1.5 text-body-sm font-semibold text-white backdrop-blur mb-6">
            @if (isDistractionFree) {
              🔒 No-distraction mode — timer pauses when you leave
            } @else {
              ⏱ Background mode — timer runs even if you leave
            }
          </span>

          <!-- Circular countdown -->
          <div class="relative w-72 h-72 md:w-80 md:h-80 mb-6">
            <svg class="w-full h-full -rotate-90" viewBox="0 0 220 220">
              <defs>
                <!-- userSpaceOnUse + a rotating transform makes the ring's colour
                     sweep continuously as the timer progresses. -->
                <linearGradient id="timerArc" gradientUnits="userSpaceOnUse" x1="14" y1="14" x2="206" y2="206">
                  <stop offset="0%" stop-color="#7c5cff"/>
                  <stop offset="50%" stop-color="#ff6aa2"/>
                  <stop offset="100%" stop-color="#56d4dd"/>
                  <animateTransform attributeName="gradientTransform" type="rotate" from="0 110 110" to="360 110 110" dur="6s" repeatCount="indefinite"/>
                </linearGradient>
                <linearGradient id="timerArcDone" gradientUnits="userSpaceOnUse" x1="14" y1="14" x2="206" y2="206">
                  <stop offset="0%" stop-color="#e8b64c"/>
                  <stop offset="50%" stop-color="#ff7a45"/>
                  <stop offset="100%" stop-color="#ff6aa2"/>
                  <animateTransform attributeName="gradientTransform" type="rotate" from="0 110 110" to="360 110 110" dur="4s" repeatCount="indefinite"/>
                </linearGradient>
              </defs>
              <!-- Track -->
              <circle cx="110" cy="110" r="96" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="8"/>
              <!-- Progress -->
              <circle cx="110" cy="110" r="96" fill="none"
                      [attr.stroke]="state() === 'running' ? 'url(#timerArc)' : 'url(#timerArcDone)'"
                      stroke-width="8" stroke-linecap="round"
                      stroke-dasharray="603.19"
                      [attr.stroke-dashoffset]="603.19 * (1 - (state() === 'overtime' ? 1 : progress()))"
                      [class.transition-all]="state() === 'running'"
                      [style.transition-duration]="state() === 'running' ? '1s' : '0.8s'"
                      [style.transition-timing-function]="'linear'"/>
            </svg>
            <!-- Time in center -->
            <div class="absolute inset-0 flex flex-col items-center justify-center px-8">
              @if (state() === 'overtime') {
                <span class="text-5xl md:text-6xl font-mono font-bold tracking-tight leading-none text-gold animate-pulse-glow tabular-nums">
                  +{{ overtimeMinStr() }}<span class="text-slate-400">:</span>{{ overtimeSecStr() }}
                </span>
                <p class="text-body-sm text-gold mt-2">overtime · banking surplus</p>
              } @else {
                <span class="text-5xl md:text-6xl font-mono font-bold tracking-tight leading-none text-white tabular-nums"
                      [class.animate-pulse-glow]="state() === 'finished'">
                  {{ minutesStr() }}<span class="text-slate-400">:</span>{{ secondsStr() }}
                </span>
                <p class="text-body-sm text-slate-300 mt-2">remaining</p>
              }
            </div>
          </div>

          <!-- Task title -->
          <p class="text-body text-slate-100 text-center max-w-sm mb-3 truncate">{{ task.title }}</p>

          <!-- Cycling motivational quote (running only) -->
          @if (state() === 'running') {
            <app-motivation-quote class="block max-w-sm w-full mb-6"></app-motivation-quote>
          }

          <!-- Controls -->
          @if (state() === 'running') {
            <div class="flex gap-4">
              @if (isPaused) {
                <button (click)="resume()"
                        class="h-14 w-14 rounded-full flex items-center justify-center bg-white/20 border border-white/20 hover:bg-white/30 transition-all">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="text-white">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </button>
              } @else {
                <button (click)="pause()"
                        class="h-14 w-14 rounded-full flex items-center justify-center bg-white/20 border border-white/20 hover:bg-white/30 transition-all">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="text-white">
                    <rect x="6" y="4" width="4" height="16" rx="1"/>
                    <rect x="14" y="4" width="4" height="16" rx="1"/>
                  </svg>
                </button>
              }
            </div>
          }

          @if (state() === 'finished') {
            <div class="flex flex-col items-center gap-3">
              <button (click)="finishDone()"
                      class="btn-primary text-lg !py-4 !px-10">
                ✅ Mark as done
              </button>
              <button (click)="keepGoing()"
                      class="btn-ghost !py-3 !px-8">
                ▶ Keep going — bank the extra as surplus
              </button>
            </div>
          }

          @if (state() === 'overtime') {
            <div class="flex flex-col items-center gap-3">
              <button (click)="overtimeDone()"
                      class="btn-primary text-lg !py-4 !px-10">
                ✓ Done — bank {{ overtimeMinutes() }} min
              </button>
              <p class="text-body-sm text-slate-300">Extra time adds to your goal's surplus, offsetting future postpones.</p>
            </div>
          }

          <!-- Celebration overlay (tap anywhere to continue) -->
          @if (showConfetti) {
            <div class="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/80 cursor-pointer"
                 (click)="finishCelebrate()">
              <div class="relative z-10 text-center animate-fade-up">
                <div class="text-6xl mb-4">🎉</div>
                <h2 class="text-display text-white font-bold mb-2">Congratulations!</h2>
                <p class="text-body-lg text-slate-200">You crushed it — keep this momentum going.</p>
                <p class="text-body-sm text-slate-400 mt-6">Tap anywhere to continue</p>
              </div>
            </div>
          }

          <!-- Confirm cancel dialog -->
          @if (showCancelConfirm) {
            <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
                 (click)="showCancelConfirm = false">
              <div class="p-6 rounded-3xl border border-white/10 text-center animate-fade-up w-full max-w-xs"
                   style="background:#121318;"
                   (click)="$event.stopPropagation()">
                <p class="text-body text-white mb-1">End this focus session?</p>
                <p class="text-body-sm text-slate-300 mb-5">Your task will stay pending.</p>
                <div class="flex flex-col gap-2">
                  <button (click)="cancel()" class="btn-primary w-full !py-3">End session</button>
                  <button (click)="showCancelConfirm = false" class="btn-ghost w-full !py-3">Keep going</button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class FocusTimerComponent implements OnInit, OnDestroy {
  @Input({ required: true }) task!: Task;
  @Output() done = new EventEmitter<Task>();
  @Output() close = new EventEmitter<void>();
  state = signal<'choosing' | 'running' | 'finished' | 'overtime'>('choosing');
  progress = signal(0);
  overtimeMs = signal(0);
  private overtimeStartedAt = 0;
  private overtimeInterval: any = null;
  isRunning = false;
  isPaused = false;
  isDistractionFree = false;
  showCancelConfirm = false;
  showConfetti = false;

  totalMs: number = 0;
  startedAt: number = 0;
  pausedAt: number | null = null;
  totalPausedMs: number = 0;
  private timerInterval: any = null;
  private celebrateTimeout: any = null;
  private visibilityHandler: (() => void) | null = null;
  private autoPaused = false;

  get totalMinutes(): number {
    // Before start() runs, totalMs is 0 — fall back to the task's estimate so the
    // chooser shows e.g. "45 min", not "0 min".
    return Math.ceil((this.totalMs || this.totalTaskMs) / 60000);
  }

  // Prior elapsed persisted (on the task doc) from an earlier ended-early session.
  priorElapsedMs = signal(0);

  constructor(private api: ApiService, public sound: SoundService) {}

  ngOnInit(): void {
    const prior = Math.max(0, Math.min(this.task.spentMs ?? 0, this.totalTaskMs));
    this.priorElapsedMs.set(prior);
  }

  private get totalTaskMs(): number {
    return (this.task.estMinutes ?? 25) * 60 * 1000;
  }

  spentMinutes(): number {
    return Math.floor(this.priorElapsedMs() / 60000);
  }

  leftMinutes(): number {
    return Math.max(0, Math.ceil((this.totalTaskMs - this.priorElapsedMs()) / 60000));
  }

  // Persist elapsed focus time to the backend and keep the local task in sync.
  // Fire-and-forget: a failed write must never block leaving the timer.
  private saveElapsed(ms: number): void {
    const clamped = Math.max(0, Math.min(ms, this.totalTaskMs));
    this.task.spentMs = clamped;
    this.api.recordFocus(this.task.taskId, clamped).subscribe({ error: () => {} });
  }

  private clearElapsed(): void {
    this.saveElapsed(0);
  }

  // Total elapsed on the current task right now (prior + this session).
  private currentElapsedMs(): number {
    if (!this.startedAt) return this.priorElapsedMs();
    const pausedNow = this.pausedAt ? Date.now() - this.pausedAt : 0;
    return Math.min(this.totalMs, Date.now() - this.startedAt - this.totalPausedMs - pausedNow);
  }

  minutesStr(): string {
    const totalSec = Math.ceil(this.remainingMs() / 1000);
    const m = Math.floor(totalSec / 60);
    return String(m).padStart(2, '0');
  }

  secondsStr(): string {
    const totalSec = Math.ceil(this.remainingMs() / 1000);
    const s = totalSec % 60;
    return String(s).padStart(2, '0');
  }

  remainingMs = signal(0);

  start(distractionFree: boolean) {
    this.isDistractionFree = distractionFree;
    this.totalMs = this.totalTaskMs;
    const prior = this.priorElapsedMs();
    // Offset the start so elapsed picks up where the earlier session left off.
    this.startedAt = Date.now() - prior;
    this.totalPausedMs = 0;
    this.isRunning = true;
    this.isPaused = false;
    this.state.set('running');
    this.remainingMs.set(Math.max(0, this.totalMs - prior));
    this.progress.set(prior / this.totalMs);
    this.sound.play('start'); // user gesture — also unlocks audio for finish/win
    this.startTicking();
    this.setupVisibility();
  }

  private startTicking() {
    this.timerInterval = setInterval(() => {
      if (!this.isRunning) return;
      const elapsed = Date.now() - this.startedAt - this.totalPausedMs;
      const remaining = Math.max(0, this.totalMs - elapsed);
      this.remainingMs.set(remaining);
      this.progress.set(1 - remaining / this.totalMs);
      if (remaining <= 0) {
        this.finish();
      }
    }, 200);
  }

  private setupVisibility() {
    this.visibilityHandler = () => {
      if (!this.isDistractionFree) return;
      if (document.hidden) {
        if (this.isRunning && !this.isPaused) {
          this.autoPaused = true;
          this.pauseInternal();
        }
      } else {
        if (this.autoPaused && !this.isRunning) {
          this.autoPaused = false;
          this.resume();
        }
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  pause() {
    this.autoPaused = false;
    this.pauseInternal();
  }

  private pauseInternal() {
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true;
    this.isRunning = false;
    this.pausedAt = Date.now();
    // Persist progress the moment we pause, so the dashboard reflects it and a
    // later resume picks up from here even if the session isn't formally ended.
    this.saveElapsed(this.currentElapsedMs());
  }

  resume() {
    if (!this.isPaused) return;
    if (this.pausedAt) {
      this.totalPausedMs += Date.now() - this.pausedAt;
      this.pausedAt = null;
    }
    this.isPaused = false;
    this.isRunning = true;
    this.autoPaused = false;
  }

  private finish() {
    this.isRunning = false;
    this.isPaused = false;
    this.remainingMs.set(0);
    this.progress.set(1);
    this.state.set('finished');
    this.sound.startLoop('finish'); // persistent alarm until user acts
    this.clearTimer();
  }

  private stopAlarm() {
    this.sound.stopLoop('finish');
  }

  // Finish → complete now (no overtime).
  finishDone() {
    this.stopAlarm();
    this.celebrate();
  }

  // Finish → keep working; count up as overtime that banks to the goal surplus.
  keepGoing() {
    this.stopAlarm();
    this.overtimeStartedAt = Date.now();
    this.overtimeMs.set(0);
    this.state.set('overtime');
    this.overtimeInterval = setInterval(() => {
      this.overtimeMs.set(Date.now() - this.overtimeStartedAt);
    }, 200);
  }

  overtimeMinutes(): number {
    return Math.round(this.overtimeMs() / 60000);
  }

  overtimeMinStr(): string {
    return String(Math.floor(this.overtimeMs() / 60000)).padStart(2, '0');
  }
  overtimeSecStr(): string {
    return String(Math.floor(this.overtimeMs() / 1000) % 60).padStart(2, '0');
  }

  private clearOvertime() {
    if (this.overtimeInterval) {
      clearInterval(this.overtimeInterval);
      this.overtimeInterval = null;
    }
  }

  // Done from overtime: bank the extra minutes as surplus, then celebrate+complete.
  overtimeDone() {
    this.clearOvertime();
    const mins = this.overtimeMinutes();
    if (mins > 0) {
      // Fire-and-forget: a failed bank must never block completing the task.
      this.api.bankSurplus(this.task.taskId, mins).subscribe({ error: () => {} });
    }
    this.celebrate();
  }

  markDone() {
    this.clearTimer();
    this.clearElapsed();
    this.done.emit(this.task);
  }

  confirmCancel() {
    this.showCancelConfirm = true;
  }

  cancel() {
    // Ending early: remember how far in, so the next start resumes from here.
    this.stopAlarm();
    this.clearOvertime();
    this.saveElapsed(this.currentElapsedMs());
    this.clearTimer();
    this.close.emit();
  }

  private clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  ngOnDestroy() {
    // Leaving via route change / browser back — save how far in so we can resume.
    // Guarded on 'running' so it never overwrites the 0 written on completion.
    if (this.startedAt && this.state() === 'running') {
      this.saveElapsed(this.currentElapsedMs());
    }
    this.clearTimer();
    this.clearOvertime();
    this.stopAlarm();
    if (this.celebrateTimeout) {
      clearTimeout(this.celebrateTimeout);
      this.celebrateTimeout = null;
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  /* ── Confetti ── */

  celebrate() {
    this.showConfetti = true;
    this.sound.play('win');

    const defaults = { colors: ['#7c5cff', '#b64dff', '#ff6aa2', '#e8b64c', '#ff7a45', '#56d4dd', '#fff', '#ffd700', '#ff4081', '#00e5ff'] };

    const fire = (particleCount: number, spread: number, originX: number, originY: number, scalar: number) => {
      confetti({ ...defaults, particleCount, spread, origin: { x: originX, y: originY }, scalar });
    };

    fire(300, 120, 0.5, 0.4, 1.2);
    setTimeout(() => fire(120, 80, 0.2, 0.5, 0.9), 200);
    setTimeout(() => fire(120, 80, 0.8, 0.5, 0.9), 400);
    setTimeout(() => fire(200, 100, 0.5, 0.4, 1.4), 600);
    setTimeout(() => fire(80, 60, 0.3, 0.3, 0.7), 1000);
    setTimeout(() => fire(80, 60, 0.7, 0.3, 0.7), 1200);
    setTimeout(() => fire(150, 90, 0.5, 0.5, 1), 1800);

    // Auto-advance after the show, or immediately if the user taps through.
    this.celebrateTimeout = setTimeout(() => this.finishCelebrate(), 4000);
  }

  // Guarded so tap-through and the auto-timeout can't both fire markDone.
  finishCelebrate() {
    if (!this.showConfetti) return;
    this.showConfetti = false;
    if (this.celebrateTimeout) {
      clearTimeout(this.celebrateTimeout);
      this.celebrateTimeout = null;
    }
    this.markDone();
  }
}
