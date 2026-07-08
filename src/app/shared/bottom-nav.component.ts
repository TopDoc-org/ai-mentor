import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="md:hidden fixed bottom-0 inset-x-0 z-40">
      <div class="mx-auto px-3 pb-[env(safe-area-inset-bottom)]">
        <div class="glass-strong my-3 rounded-2xl px-1 py-1.5 flex items-stretch">
          <a routerLink="/dashboard" routerLinkActive="text-white"
             [routerLinkActiveOptions]="{ exact: true }"
             class="flex-1 min-w-0 flex flex-col items-center gap-0.5 py-1.5 text-slate-400 transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 11l9-8 9 8" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M5 10v10h14V10" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="text-[10px] font-medium leading-none">Today</span>
          </a>

          <a routerLink="/tasks" routerLinkActive="text-white"
             class="flex-1 min-w-0 flex flex-col items-center gap-0.5 py-1.5 text-slate-400 transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11l3 3L22 4" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="text-[10px] font-medium leading-none">To-dos</span>
          </a>

          <a routerLink="/reminders" routerLinkActive="text-white"
             class="flex-1 min-w-0 flex flex-col items-center gap-0.5 py-1.5 text-slate-400 transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span class="text-[10px] font-medium leading-none">Reminders</span>
          </a>

          <a routerLink="/notes" routerLinkActive="text-white"
             class="flex-1 min-w-0 flex flex-col items-center gap-0.5 py-1.5 text-slate-400 transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16v12l-4 4H4z"/><path d="M14 20v-4h4"/>
            </svg>
            <span class="text-[10px] font-medium leading-none">Notes</span>
          </a>

          <button (click)="createOpen.set(true)" aria-label="Create"
             class="flex-1 min-w-0 flex flex-col items-center gap-0.5 py-1.5 text-accent-soft transition-colors">
            <span class="h-[22px] w-[22px] rounded-lg flex items-center justify-center text-white shadow-glow"
                  style="background-image:linear-gradient(135deg,#7c5cff,#b64dff)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 5v14M5 12h14" stroke-linecap="round"/>
              </svg>
            </span>
            <span class="text-[10px] font-medium leading-none">Create</span>
          </button>

          <button (click)="moreOpen.set(true)" aria-label="More"
             class="flex-1 min-w-0 flex flex-col items-center gap-0.5 py-1.5 text-slate-400 transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
            </svg>
            <span class="text-[10px] font-medium leading-none">More</span>
          </button>

        </div>
      </div>
    </nav>

    <!-- Floating Create button — shown on tablet/laptop (md+), where the bottom
         bar above is hidden. Never overlaps the bar: bar is md:hidden, this is
         hidden md:flex, so exactly one Create entry exists at every width. -->
    <button (click)="createOpen.set(true)" aria-label="Create"
      class="fab-create hidden md:flex fixed bottom-7 right-7 z-40 items-center gap-2 h-16 pl-5 pr-6 rounded-full text-white font-extrabold text-base ring-4 ring-accent/30 hover:ring-accent/50 hover:scale-105 active:scale-95 transition-all"
      style="background-image:linear-gradient(135deg,#7c5cff 0%,#b64dff 55%,#ff5cc8 100%)">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <path d="M12 5v14M5 12h14" stroke-linecap="round"/>
      </svg>
      <span>Create</span>
    </button>

    <!-- Create chooser modal -->
    <div *ngIf="createOpen()" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50"
         (click)="createOpen.set(false)" (keydown.escape)="createOpen.set(false)" tabindex="-1">
      <div class="glass-strong p-6 w-full max-w-sm animate-fade-up"
           role="dialog" aria-modal="true" aria-labelledby="createTitle" (click)="$event.stopPropagation()">
        <h3 id="createTitle" class="text-heading text-white mb-1 text-center">What do you want to create?</h3>
        <p class="text-body-sm text-slate-400 mb-5 text-center">A goal, a quick to-do, a reminder, or a note.</p>
        <div class="grid grid-cols-2 gap-3">
          <button (click)="chooseCreate('goal')"
                  class="card p-4 flex flex-col items-center gap-2 hover:border-accent/40 transition">
            <span class="text-2xl">🎯</span>
            <span class="text-white font-semibold text-body-sm">Goal</span>
            <span class="text-caption text-slate-400 text-center">Planned into daily action.</span>
          </button>
          <button (click)="chooseCreate('todo')"
                  class="card p-4 flex flex-col items-center gap-2 hover:border-accent/40 transition">
            <span class="text-2xl">✅</span>
            <span class="text-white font-semibold text-body-sm">To-do</span>
            <span class="text-caption text-slate-400 text-center">A one-off task.</span>
          </button>
          <button (click)="chooseCreate('reminder')"
                  class="card p-4 flex flex-col items-center gap-2 hover:border-accent/40 transition">
            <span class="text-2xl">🔔</span>
            <span class="text-white font-semibold text-body-sm">Reminder</span>
            <span class="text-caption text-slate-400 text-center">Nudge on a day &amp; time.</span>
          </button>
          <button (click)="chooseCreate('note')"
                  class="card p-4 flex flex-col items-center gap-2 hover:border-accent/40 transition">
            <span class="text-2xl">🗒️</span>
            <span class="text-white font-semibold text-body-sm">Note</span>
            <span class="text-caption text-slate-400 text-center">Something to remember.</span>
          </button>
        </div>
        <button class="btn-ghost w-full mt-4 text-sm !py-2" (click)="createOpen.set(false)">Cancel</button>
      </div>
    </div>

    <!-- More sheet: overflow destinations not in the main bar -->
    <div *ngIf="moreOpen()" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50"
         (click)="moreOpen.set(false)" (keydown.escape)="moreOpen.set(false)" tabindex="-1">
      <div class="glass-strong w-full max-w-sm rounded-t-2xl p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] animate-fade-up"
           role="dialog" aria-modal="true" aria-labelledby="moreTitle" (click)="$event.stopPropagation()">
        <h3 id="moreTitle" class="text-heading text-white mb-3 text-center">More</h3>
        <div class="flex flex-col">
          <a routerLink="/projects" routerLinkActive="text-white bg-white/10" (click)="moreOpen.set(false)"
             class="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-300 hover:bg-white/5 transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span class="text-body-sm font-medium">Team</span>
          </a>
          <a routerLink="/score" routerLinkActive="text-white bg-white/10" (click)="moreOpen.set(false)"
             class="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-300 hover:bg-white/5 transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 21h8M12 17v4"/>
              <path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/>
              <path d="M7 5H4a2 2 0 0 0 2 4M17 5h3a2 2 0 0 1-2 4"/>
            </svg>
            <span class="text-body-sm font-medium">Score</span>
          </a>
          <a routerLink="/network" routerLinkActive="text-white bg-white/10" (click)="moreOpen.set(false)"
             class="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-300 hover:bg-white/5 transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/>
              <path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/>
            </svg>
            <span class="text-body-sm font-medium">Network</span>
          </a>
          <a routerLink="/progress" routerLinkActive="text-white bg-white/10" (click)="moreOpen.set(false)"
             class="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-300 hover:bg-white/5 transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19V5M10 19v-8M16 19V9M22 19H2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="text-body-sm font-medium">Progress</span>
          </a>
          <a routerLink="/profile" routerLinkActive="text-white bg-white/10" (click)="moreOpen.set(false)"
             class="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-300 hover:bg-white/5 transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <span class="text-body-sm font-medium">Profile</span>
          </a>
        </div>
        <button class="btn-ghost w-full mt-2 text-sm !py-2" (click)="moreOpen.set(false)">Cancel</button>
      </div>
    </div>
  `,
  styles: [`
    /* Vibrant, breathing glow so the Create button reads as the primary action. */
    .fab-create {
      box-shadow: 0 10px 30px -6px rgba(124, 92, 255, 0.7), 0 0 0 rgba(255, 92, 200, 0.5);
      animation: fabGlow 2.4s ease-in-out infinite;
    }
    .fab-create:hover { animation-play-state: paused; }
    @keyframes fabGlow {
      0%, 100% { box-shadow: 0 10px 30px -6px rgba(124, 92, 255, 0.55), 0 0 0 0 rgba(255, 92, 200, 0.45); }
      50%      { box-shadow: 0 14px 40px -6px rgba(182, 77, 255, 0.8), 0 0 0 8px rgba(255, 92, 200, 0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .fab-create { animation: none; }
    }
  `],
})
export class BottomNavComponent {
  createOpen = signal(false);
  moreOpen = signal(false);

  constructor(private router: Router) {}

  chooseCreate(kind: 'goal' | 'todo' | 'reminder' | 'note') {
    this.createOpen.set(false);
    if (kind === 'goal') this.router.navigate(['/new']);
    else if (kind === 'reminder') this.router.navigate(['/reminders'], { queryParams: { new: 1 } });
    else if (kind === 'note') this.router.navigate(['/notes'], { queryParams: { new: 1 } });
    else this.router.navigate(['/tasks'], { queryParams: { new: 1 } });
  }
}
