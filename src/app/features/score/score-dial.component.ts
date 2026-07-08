import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CounterDirective } from '../../shared/counter.directive';

// Reusable CIBIL-style semicircle gauge. `percent` (0-100) drives the arc fill;
// `score` is the big number shown in the middle. Flame→gold→accent arc matches
// the app's brand tokens. Hand-rolled SVG (no chart dep), theme-agnostic colors.
@Component({
  selector: 'app-score-dial',
  standalone: true,
  imports: [CommonModule, CounterDirective],
  template: `
    <div class="relative inline-block" [style.width.px]="size" [style.height.px]="size * 0.62">
      <svg [attr.width]="size" [attr.height]="size * 0.62" [attr.viewBox]="'0 0 ' + size + ' ' + (size * 0.62)">
        <defs>
          <linearGradient [attr.id]="gid" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#ff7a45" />
            <stop offset="0.5" stop-color="#e8b64c" />
            <stop offset="1" stop-color="#7c5cff" />
          </linearGradient>
        </defs>
        <!-- track -->
        <path [attr.d]="arcPath()" fill="none" class="stroke-ink-800" stroke-width="16" stroke-linecap="round"
              [style.stroke]="'rgba(148,163,184,0.18)'" />
        <!-- value -->
        <path [attr.d]="arcPath()" fill="none" [attr.stroke]="'url(#' + gid + ')'" stroke-width="16" stroke-linecap="round"
              [attr.stroke-dasharray]="dash()" class="transition-all duration-700" />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-end pb-1 text-center">
        <span class="font-extrabold text-white leading-none" [style.font-size.px]="size * 0.19" [counter]="score"></span>
        <span class="text-slate-400 mt-0.5" [style.font-size.px]="size * 0.055">of {{ max }}</span>
      </div>
    </div>
  `,
})
export class ScoreDialComponent {
  @Input() score = 300;
  @Input() percent = 0; // 0-100 arc fill
  @Input() size = 240;
  @Input() max = 900;

  // Unique gradient id so multiple dials on one page don't clash.
  gid = 'dial-' + Math.random().toString(36).slice(2, 8);

  private R = computed(() => this.size * 0.42);
  private cx = computed(() => this.size / 2);
  private cy = computed(() => this.size * 0.55);

  arcPath = computed(() => {
    const r = this.R();
    const cx = this.cx();
    const cy = this.cy();
    return `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  });

  dash = computed(() => {
    const r = this.R();
    const circ = Math.PI * r; // semicircle length
    const p = Math.max(0, Math.min(100, this.percent));
    return `${((p / 100) * circ).toFixed(1)} ${circ.toFixed(1)}`;
  });
}
