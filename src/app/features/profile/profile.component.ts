import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { BottomNavComponent } from '../../shared/bottom-nav.component';
import { TopBarComponent } from '../../shared/top-bar.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BottomNavComponent, TopBarComponent],
  template: `
    <app-top-bar></app-top-bar>

    <div class="max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto w-full px-4 md:px-6 lg:px-8 pt-6 md:pt-8 lg:pt-10 pb-28 md:pb-10 min-h-screen">
      <a routerLink="/dashboard" class="text-body-sm text-slate-400 hover:text-white mb-6 md:mb-8 inline-block">← Today</a>

      <div class="text-center animate-fade-up">
        <div class="h-16 w-16 md:h-20 md:w-20 mx-auto rounded-2xl md:rounded-3xl flex items-center justify-center text-white text-xl md:text-2xl font-black shadow-glow"
             style="background-image:linear-gradient(135deg,#7c5cff,#b64dff)">{{ initial() }}</div>
        <h1 class="text-heading-xl text-white mt-4">{{ user()?.name || 'You' }}</h1>
        <p class="text-body-sm text-slate-400">Your personal Zenamaze account</p>
      </div>

      <div class="glass p-4 md:p-5 mt-6 md:mt-8 space-y-4 animate-fade-up max-w-md mx-auto">
        <div class="flex items-center justify-between">
          <span class="text-body-sm text-slate-400">Email</span>
          <span class="text-body-sm text-slate-200 truncate ml-2">{{ user()?.email || '—' }}</span>
        </div>
        <div class="h-px bg-white/5"></div>
        <div class="flex items-center justify-between">
          <span class="text-body-sm text-slate-400">Mobile</span>
          <span class="text-body-sm text-slate-200">{{ user()?.phone || '—' }}</span>
        </div>
      </div>

      <!-- Zenamaze language -->
      <div class="glass p-4 md:p-5 mt-4 animate-fade-up max-w-md mx-auto">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-body-sm font-medium text-white">Zenamaze language</p>
            <p class="text-caption text-slate-400 mt-0.5">The language your Zenamaze roasts &amp; motivates you in.</p>
          </div>
          <select class="input !w-auto shrink-0" [ngModel]="lang()" (ngModelChange)="saveLang($event)" [disabled]="langSaving()">
            <option *ngFor="let l of languages" [value]="l">{{ l }}</option>
          </select>
        </div>
        <p *ngIf="langSaved()" class="text-caption text-emerald-400 mt-2">Saved — next roast comes in {{ lang() }}.</p>
        <p *ngIf="langError()" class="text-caption text-flame mt-2">{{ langError() }}</p>
      </div>

      <!-- Change password -->
      <div class="glass p-4 md:p-5 mt-4 animate-fade-up max-w-md mx-auto">
        <button class="w-full flex items-center justify-between" (click)="togglePw()">
          <span class="text-body-sm font-medium text-white">Change password</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               class="text-slate-400 transition-transform" [class.rotate-180]="pwOpen()">
            <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <form *ngIf="pwOpen()" (ngSubmit)="submitPw()" class="mt-4 space-y-3 animate-fade-up">
          <div>
            <label class="label">Current password</label>
            <input class="input" type="password" name="current" autocomplete="current-password"
                   [(ngModel)]="current" placeholder="••••••••" />
          </div>
          <div>
            <label class="label">New password</label>
            <input class="input" type="password" name="next" autocomplete="new-password"
                   [(ngModel)]="next" placeholder="At least 6 characters" />
          </div>
          <div>
            <label class="label">Confirm new password</label>
            <input class="input" type="password" name="confirm" autocomplete="new-password"
                   [(ngModel)]="confirm" placeholder="Re-enter new password" />
          </div>

          <p *ngIf="error()" class="text-sm text-flame">{{ error() }}</p>
          <p *ngIf="success()" class="text-sm text-emerald-400">Password updated.</p>

          <button class="btn-primary w-full !mt-4" type="submit" [disabled]="saving()">
            {{ saving() ? 'Updating…' : 'Update password' }}
          </button>
        </form>
      </div>

      <!-- Team -->
      <div class="glass p-4 md:p-5 mt-4 animate-fade-up max-w-md mx-auto space-y-3">
        <a routerLink="/network" class="w-full flex items-center justify-between">
          <span class="text-body-sm font-medium text-white">🤝 My Network</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-slate-400">
            <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
        <div class="h-px bg-white/5"></div>
        <a routerLink="/projects" class="w-full flex items-center justify-between">
          <span class="text-body-sm font-medium text-white">👥 Team Projects</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-slate-400">
            <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      </div>

      <button class="btn-ghost w-full mt-6 !text-flame max-w-md mx-auto block" (click)="logout()">Log out</button>

      <!-- Danger zone: delete account -->
      <div class="glass p-4 md:p-5 mt-4 border border-flame/20 animate-fade-up max-w-md mx-auto">
        <button class="w-full flex items-center justify-between" (click)="toggleDelete()">
          <span class="text-body-sm font-medium text-flame">Delete account</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               class="text-flame/70 transition-transform" [class.rotate-180]="delOpen()">
            <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <div *ngIf="delOpen()" class="mt-4 space-y-3 animate-fade-up">
          <p class="text-body-sm text-slate-300">
            This permanently deletes your account and <strong>all</strong> your goals, plans, tasks,
            to-dos, reminders and notes. Deletion is scheduled after a 30-day grace period — you can
            cancel any time before then by logging back in.
          </p>
          <p *ngIf="!delDone()" class="text-body-sm text-slate-400">
            To confirm, enter your password and type <strong>DELETE</strong> below.
          </p>

          <ng-container *ngIf="!delDone(); else deleteScheduled">
            <div>
              <label class="label">Password</label>
              <input class="input" type="password" name="delpw" autocomplete="current-password"
                     [(ngModel)]="delPassword" placeholder="••••••••" />
            </div>
            <div>
              <label class="label">Type DELETE to confirm</label>
              <input class="input" type="text" name="delconfirm" [(ngModel)]="delConfirm" placeholder="DELETE" />
            </div>

            <p *ngIf="delError()" class="text-sm text-flame">{{ delError() }}</p>

            <button class="btn-primary w-full !mt-4 !bg-flame hover:!bg-flame/90"
                    type="button" (click)="submitDelete()"
                    [disabled]="delSaving() || delConfirm.trim().toUpperCase() !== 'DELETE' || !delPassword">
              {{ delSaving() ? 'Deleting…' : 'Delete my account' }}
            </button>
          </ng-container>

          <ng-template #deleteScheduled>
            <p class="text-sm text-emerald-400">{{ delMessage() }}</p>
          </ng-template>
        </div>
      </div>
    </div>

    <app-bottom-nav></app-bottom-nav>
  `,
})
export class ProfileComponent {
  user = computed(() => this.auth.user());
  initial = computed(() => {
    const n = this.auth.user()?.name?.trim();
    return n ? n[0].toUpperCase() : 'Y';
  });

  pwOpen = signal(false);
  current = '';
  next = '';
  confirm = '';
  saving = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  // Zenamaze language. Must mirror SUPPORTED_LANGUAGES on the backend.
  languages = ['English', 'Hindi', 'Hinglish', 'Spanish', 'French', 'German', 'Portuguese', 'Tamil', 'Telugu', 'Marathi', 'Bengali', 'Arabic', 'Meme'];
  lang = computed(() => this.auth.user()?.language || 'Meme');
  langSaving = signal(false);
  langSaved = signal(false);
  langError = signal<string | null>(null);

  constructor(private auth: AuthService, private api: ApiService, private router: Router) {}

  saveLang(language: string) {
    if (this.langSaving() || language === this.lang()) return;
    this.langSaving.set(true);
    this.langSaved.set(false);
    this.langError.set(null);
    this.api.updateLanguage(language).subscribe({
      next: (r) => {
        this.auth.setUser(r.user);
        this.langSaving.set(false);
        this.langSaved.set(true);
        setTimeout(() => this.langSaved.set(false), 3000);
      },
      error: (e) => {
        this.langSaving.set(false);
        this.langError.set(e?.error?.message || 'Could not update language. Try again.');
      },
    });
  }

  togglePw() {
    this.pwOpen.set(!this.pwOpen());
    this.error.set(null);
    this.success.set(false);
  }

  submitPw() {
    if (this.saving()) return;
    this.error.set(null);
    this.success.set(false);

    if (!this.current || !this.next) {
      this.error.set('Enter your current and new password.');
      return;
    }
    if (this.next.length < 6) {
      this.error.set('New password must be at least 6 characters.');
      return;
    }
    if (this.next !== this.confirm) {
      this.error.set('New passwords do not match.');
      return;
    }
    if (this.next === this.current) {
      this.error.set('New password must be different from the current one.');
      return;
    }

    this.saving.set(true);
    this.api.changePassword(this.current, this.next).subscribe({
      next: () => {
        this.saving.set(false);
        this.success.set(true);
        this.current = this.next = this.confirm = '';
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(e?.error?.message || 'Could not update password. Try again.');
      },
    });
  }

  // --- Delete account (danger zone) ---
  delOpen = signal(false);
  delPassword = '';
  delConfirm = '';
  delSaving = signal(false);
  delError = signal<string | null>(null);
  delDone = signal(false);
  delMessage = signal('');

  toggleDelete() {
    this.delOpen.set(!this.delOpen());
    this.delError.set(null);
  }

  submitDelete() {
    if (this.delSaving() || this.delDone()) return;
    this.delError.set(null);
    if (this.delConfirm.trim().toUpperCase() !== 'DELETE') {
      this.delError.set('Type DELETE to confirm.');
      return;
    }
    if (!this.delPassword) {
      this.delError.set('Enter your password.');
      return;
    }
    this.delSaving.set(true);
    this.api.deleteAccount(this.delPassword).subscribe({
      next: (r) => {
        this.delSaving.set(false);
        this.delDone.set(true);
        this.delMessage.set(
          r?.message ||
            'Your account is scheduled for deletion. You can cancel by logging back in within 30 days.'
        );
        this.delPassword = this.delConfirm = '';
        // Sign out shortly after showing the confirmation, then send to login.
        setTimeout(() => {
          this.auth.logout();
          this.router.navigate(['/login']);
        }, 3500);
      },
      error: (e) => {
        this.delSaving.set(false);
        this.delError.set(e?.error?.message || 'Could not delete your account. Try again.');
      },
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
