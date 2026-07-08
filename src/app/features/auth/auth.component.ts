import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ThemeService } from '../../core/theme.service';
import { SeoService } from '../../core/seo.service';
import { ROAST_LEVELS } from '../../core/models';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen grid md:grid-cols-2">
      <!-- Aspirational hero -->
      <div class="hidden md:flex flex-col justify-between p-8 lg:p-12 relative overflow-hidden">
        <div class="flex items-center gap-2.5">
          <img src="icon.svg" alt="" class="h-10 w-10 rounded-2xl object-cover">
          <span class="text-display font-brand tracking-tight text-white">Zenamaze</span>
          <div class="flex-1"></div>
          <button (click)="theme.toggle()"
             class="h-8 w-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-slate-200 hover:bg-white/20 transition-all shrink-0"
             [attr.aria-label]="theme.isLight() ? 'Switch to dark mode' : 'Switch to light mode'">
            @if (theme.isLight()) {
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            } @else {
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            }
          </button>
        </div>

        <div class="max-w-lg animate-fade-up">
          <span class="chip mb-6">◆ For people who actually finish</span>
          <h1 class="font-heading text-display-xl lg:text-display-2xl leading-[1.05] text-white">
            Turn a big ambition into <span class="accent-text">one move today.</span>
          </h1>
          <p class="text-body-lg text-slate-300/80 mt-6">
            Zenamaze interrogates what you really want, builds the system to get there, and puts a single
            daily action in front of you — until it's done.
          </p>
          <div class="flex flex-wrap gap-2.5 mt-8">
            <span class="chip">🎯 Goal → daily habit</span>
            <span class="chip">🔥 Streaks that sting to break</span>
            <span class="chip">🧠 A coach that digs deep</span>
          </div>
        </div>

        <p class="text-slate-400 text-sm">Built for the ambitious. Show up daily. Compound.</p>
      </div>

      <!-- Form panel -->
      <div class="flex items-center justify-center px-4 md:px-6 py-8 md:py-12">
        <div class="w-full max-w-sm md:max-w-md animate-fade-up">
          <div class="md:hidden flex items-center gap-2.5 mb-8 justify-center">
            <img src="icon.svg" alt="" class="h-9 w-9 rounded-xl object-cover">
            <span class="text-display font-brand text-white">Zenamaze</span>
            <button (click)="theme.toggle()"
               class="h-8 w-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-slate-200 hover:bg-white/20 transition-all shrink-0 ml-2"
               [attr.aria-label]="theme.isLight() ? 'Switch to dark mode' : 'Switch to light mode'">
              @if (theme.isLight()) {
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              } @else {
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <circle cx="12" cy="12" r="5"/>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
              }
            </button>
          </div>

          <div class="glass-strong p-6 md:p-8">
            <h2 class="text-heading-xl text-white mb-1">
              {{ mode() === 'login' ? 'Welcome back' : 'Start your system' }}
            </h2>
            <p class="text-body-sm text-slate-400 mb-6 md:mb-7">
              {{ mode() === 'login' ? 'Your streak is waiting.' : 'Your first goal is two minutes away.' }}
            </p>

            <form (ngSubmit)="submit()" class="space-y-4">
              <!-- Register fields -->
              <div *ngIf="mode() === 'register'">
                <label class="label">Name</label>
                <input class="input" [(ngModel)]="name" name="name" placeholder="What should we call you?" />
              </div>
              <div *ngIf="mode() === 'register'">
                <label class="label">Email</label>
                <input class="input" [(ngModel)]="email" name="email" type="email" placeholder="you@email.com" required />
              </div>
              <div *ngIf="mode() === 'register'">
                <label class="label">Mobile number</label>
                <input class="input" [(ngModel)]="phone" name="phone" type="tel" inputmode="tel" placeholder="+91 98765 43210" required />
              </div>

              <!-- Login field: email OR mobile -->
              <div *ngIf="mode() === 'login'">
                <label class="label">Email or mobile</label>
                <input class="input" [(ngModel)]="identifier" name="identifier" placeholder="you@email.com or 98765 43210" required />
              </div>

              <div>
                <label class="label">Password</label>
                <input class="input" [(ngModel)]="password" name="password" type="password" placeholder="••••••••" required />
              </div>

              <!-- Roast level (register only): how hard should Zenamaze go? -->
              <div *ngIf="mode() === 'register'">
                <label class="label">How hard should Zenamaze roast you?</label>
                <div class="grid grid-cols-2 gap-2">
                  <button *ngFor="let lv of roastLevels" type="button"
                          (click)="roastLevel = lv.id"
                          class="text-left rounded-xl border px-3 py-2 transition"
                          [ngClass]="roastLevel === lv.id ? 'border-accent bg-accent/10' : 'border-white/10 hover:border-white/25'">
                    <span class="text-body-sm font-semibold text-white">{{ lv.emoji }} {{ lv.label }}</span>
                    <span class="block text-caption text-slate-400 leading-tight mt-0.5">{{ lv.desc }}</span>
                  </button>
                </div>
                <p class="text-caption text-slate-500 mt-1.5">Change it anytime near the roast.</p>
              </div>

              <p *ngIf="error()" class="text-sm text-flame">{{ error() }}</p>

              <button class="btn-primary w-full !mt-6" type="submit" [disabled]="loading()">
                {{ loading() ? 'Please wait…' : mode() === 'login' ? 'Log in' : 'Create my account' }}
              </button>
            </form>

            <p class="text-body-sm text-slate-400 text-center mt-6">
              {{ mode() === 'login' ? "New here?" : 'Already have an account?' }}
              <button class="accent-text font-semibold hover:underline ml-1" (click)="toggle()">
                {{ mode() === 'login' ? 'Create one' : 'Log in' }}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AuthComponent implements OnInit {
  theme = inject(ThemeService);
  mode = signal<'login' | 'register'>('login');
  email = '';
  phone = '';
  identifier = '';
  password = '';
  name = '';
  roastLevel = 'balanced';
  roastLevels = ROAST_LEVELS;
  loading = signal(false);
  error = signal<string | null>(null);
  claimGoalId?: string;
  private seo = inject(SeoService);

  constructor(private auth: AuthService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.seo.update({
      title: 'Log in or sign up · Zenamaze',
      description:
        'Log in to Zenamaze or create a free account to save your plan, track daily tasks and keep your streak alive.',
      path: '/login',
    });
    // Arriving from a guest plan: default to sign-up so they can save it.
    this.claimGoalId = this.route.snapshot.queryParamMap.get('claim') || undefined;
    if (this.claimGoalId) this.mode.set('register');
  }

  toggle() {
    this.mode.set(this.mode() === 'login' ? 'register' : 'login');
    this.error.set(null);
  }

  submit() {
    const isLogin = this.mode() === 'login';
    if (isLogin && (!this.identifier || !this.password)) {
      this.error.set('Enter your email/mobile and password.');
      return;
    }
    if (!isLogin && (!this.email || !this.phone || !this.password)) {
      this.error.set('Email, mobile number and password are required.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    const req = isLogin
      ? this.auth.login(this.identifier, this.password, this.claimGoalId)
      : this.auth.register(
          { name: this.name, email: this.email, phone: this.phone, password: this.password, roastLevel: this.roastLevel },
          this.claimGoalId
        );
    req.subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e) => {
        this.loading.set(false);
        this.error.set(e?.error?.message || 'Something went wrong. Try again.');
      },
    });
  }
}
