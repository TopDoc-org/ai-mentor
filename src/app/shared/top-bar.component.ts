import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="flex items-center justify-between px-4 md:px-6 lg:px-8 py-3 border-b border-white/5 bg-ink-950/80 backdrop-blur-lg sticky top-0 z-40">
      <div class="flex items-center gap-1 max-w-6xl mx-auto w-full">
        <a routerLink="/dashboard" class="flex items-center gap-2 text-white font-extrabold text-heading mr-4 lg:mr-6 shrink-0">
          <img src="icon.svg" alt="" class="h-8 w-8 rounded-xl object-cover">
          <span class="hidden sm:inline font-brand">Zenamaze</span>
        </a>
        <div class="hidden md:flex items-center gap-0.5">
          <a routerLink="/dashboard" routerLinkActive="text-white bg-white/10" [routerLinkActiveOptions]="{exact:true}"
             class="px-2.5 lg:px-3 py-2 rounded-lg text-body-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all whitespace-nowrap">Today</a>
          <a routerLink="/tasks" routerLinkActive="text-white bg-white/10"
             class="px-2.5 lg:px-3 py-2 rounded-lg text-body-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all whitespace-nowrap">To-dos</a>
          <a routerLink="/reminders" routerLinkActive="text-white bg-white/10"
             class="px-2.5 lg:px-3 py-2 rounded-lg text-body-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all whitespace-nowrap">Reminders</a>
          <a routerLink="/notes" routerLinkActive="text-white bg-white/10"
             class="px-2.5 lg:px-3 py-2 rounded-lg text-body-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all whitespace-nowrap">Notes</a>
          <a routerLink="/progress" routerLinkActive="text-white bg-white/10"
             class="px-2.5 lg:px-3 py-2 rounded-lg text-body-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all whitespace-nowrap">Progress</a>
          <a routerLink="/score" routerLinkActive="text-white bg-white/10"
             class="px-2.5 lg:px-3 py-2 rounded-lg text-body-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all whitespace-nowrap">Score</a>
          <a routerLink="/network" routerLinkActive="text-white bg-white/10"
             class="px-2.5 lg:px-3 py-2 rounded-lg text-body-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all whitespace-nowrap">Network</a>
          <a routerLink="/projects" routerLinkActive="text-white bg-white/10"
             class="px-2.5 lg:px-3 py-2 rounded-lg text-body-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all whitespace-nowrap">Team</a>
        </div>
        <div class="flex-1"></div>
        <button (click)="theme.toggle()"
           class="h-9 w-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-slate-200 hover:bg-white/20 transition-all shrink-0"
           [attr.aria-label]="theme.isLight() ? 'Switch to dark mode' : 'Switch to light mode'">
          @if (theme.isLight()) {
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          } @else {
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          }
        </button>
        <a routerLink="/profile"
           class="h-9 w-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-slate-200 text-sm font-bold hover:bg-white/20 transition-all shrink-0">{{ initial() }}</a>
      </div>
    </nav>
  `,
})
export class TopBarComponent {
  theme = inject(ThemeService);
  initial = computed(() => {
    const n = this.auth.user()?.name?.trim();
    return n ? n[0].toUpperCase() : 'Y';
  });
  constructor(private auth: AuthService) {}
}
