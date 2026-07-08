import { Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/auth.service';
import { ApiService } from '../core/api.service';
import { ROAST_LEVELS } from '../core/models';

// Compact dropdown to change the Zenamaze's roast harshness right next to the roast.
// Persists via PATCH /account/roast-level, updates the cached user, and emits
// `changed` so the host can re-fetch the roast at the new level.
@Component({
  selector: 'app-roast-level-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative inline-block">
      <button type="button" (click)="open.set(!open())"
        class="inline-flex items-center gap-1 text-micro uppercase tracking-wider text-slate-400 hover:text-white transition">
        <span>{{ current().emoji }} {{ current().label }}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>

      <button *ngIf="open()" (click)="open.set(false)" class="fixed inset-0 z-20 cursor-default" aria-hidden="true"></button>
      <div *ngIf="open()" class="absolute right-0 z-30 mt-1 w-56 rounded-xl p-1.5 border border-white/10 bg-[#16141f] shadow-card">
        <button *ngFor="let lv of levels" type="button" (click)="pick(lv.id)" [disabled]="saving()"
          class="w-full text-left rounded-lg px-2.5 py-1.5 flex items-start gap-2 hover:bg-white/5 transition"
          [ngClass]="{ 'bg-white/5': lv.id === current().id }">
          <span class="text-base leading-none mt-0.5">{{ lv.emoji }}</span>
          <span class="min-w-0">
            <span class="block text-body-sm text-white font-medium">{{ lv.label }}</span>
            <span class="block text-caption text-slate-400 leading-tight">{{ lv.desc }}</span>
          </span>
        </button>
      </div>
    </div>
  `,
})
export class RoastLevelSwitcherComponent {
  @Output() changed = new EventEmitter<void>();
  private auth = inject(AuthService);
  private api = inject(ApiService);

  levels = ROAST_LEVELS;
  open = signal(false);
  saving = signal(false);

  current = computed(() => {
    const id = this.auth.user()?.roastLevel || 'brutal';
    return this.levels.find((l) => l.id === id) || this.levels[2];
  });

  pick(id: string) {
    if (this.saving() || id === this.current().id) { this.open.set(false); return; }
    this.saving.set(true);
    this.api.updateRoastLevel(id).subscribe({
      next: (r) => { this.auth.setUser(r.user); this.saving.set(false); this.open.set(false); this.changed.emit(); },
      error: () => { this.saving.set(false); this.open.set(false); },
    });
  }
}
