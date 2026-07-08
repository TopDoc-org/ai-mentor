import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { BottomNavComponent } from '../../shared/bottom-nav.component';
import { TopBarComponent } from '../../shared/top-bar.component';

@Component({
  selector: 'app-new-goal',
  standalone: true,
  imports: [CommonModule, RouterLink, BottomNavComponent, TopBarComponent],
  template: `
    <app-top-bar></app-top-bar>

    <div class="max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto w-full px-4 md:px-6 lg:px-8 pt-6 md:pt-8 lg:pt-10 pb-28 md:pb-10 min-h-screen flex flex-col">
      <a routerLink="/dashboard" class="text-body-sm text-slate-400 hover:text-white mb-6 md:mb-8">← Today</a>

      <!-- Invitation card -->
      <div class="glass-strong p-6 md:p-8 lg:p-10 text-center animate-fade-up">
        <!-- Zenamaze avatar -->
        <img src="icon.svg" alt="" class="h-16 w-16 md:h-20 md:w-20 mx-auto rounded-2xl md:rounded-3xl object-cover shadow-glow">

        <h1 class="text-heading-xl md:text-display gradient-text mt-5 md:mt-6">Have a new goal in mind?</h1>
        <p class="text-body md:text-body-lg text-slate-300 mt-3 max-w-md mx-auto leading-relaxed">
          Let's talk it through with Zenamaze. I'll dig into what really matters and turn it into a
          daily process you can actually follow.
        </p>

        <button class="btn-primary w-full sm:w-auto sm:px-10 mt-7 md:mt-8" (click)="start()" [disabled]="loading()">
          {{ loading() ? 'Opening chat…' : '💬 Talk to Zenamaze →' }}
        </button>

        <p class="text-caption text-slate-500 mt-3">Takes about 2 minutes. No forms — just a conversation.</p>
      </div>

      <!-- Quick starts -->
      <div class="mt-8 md:mt-10 animate-fade-up" style="animation-delay:80ms">
        <p class="text-micro uppercase tracking-wider text-slate-400 mb-3 text-center">Or start from a common goal</p>
        <div class="flex flex-wrap justify-center gap-2">
          <button *ngFor="let s of suggestions" class="chip hover:border-accent/40 transition"
                  [disabled]="loading()" (click)="start(s)">{{ s }}</button>
        </div>
      </div>
    </div>

    <app-bottom-nav></app-bottom-nav>
  `,
})
export class NewGoalComponent {
  loading = signal(false);
  suggestions = [
    'Lose fat and get fit in 3 months',
    'Switch to a top product company in 6 months',
    'Read 12 books this year',
    'Launch my side project in 8 weeks',
  ];

  constructor(private api: ApiService, private router: Router) {}

  // Start a goal session (optionally seeded with a title) and drop into the chat.
  // Zenamaze's opening question captures the goal when no seed is given.
  start(seed = '') {
    if (this.loading()) return;
    this.loading.set(true);
    this.api.createGoal(seed.trim()).subscribe({
      next: (g) => this.router.navigate(['/onboarding', g.goalId]),
      error: () => this.loading.set(false),
    });
  }
}
