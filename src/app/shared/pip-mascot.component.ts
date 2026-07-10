import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

// Pip — the onboarding sidekick's face. A small glowing buddy, deliberately
// distinct from the Zenamaze's stern "M" avatar. Three moods tweak the mouth so
// Pip can react (default happy, celebrate on a win, think while the AI works).
@Component({
  selector: 'app-pip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="pip inline-flex items-center justify-center rounded-full shadow-glow select-none shrink-0"
          [class.pip-bob]="bob"
          [style.width.px]="size" [style.height.px]="size"
          style="background-image:linear-gradient(135deg,#7c5cff,#b64dff)"
          aria-hidden="true">
      <svg [attr.width]="size * 0.66" [attr.height]="size * 0.66" viewBox="0 0 40 40" fill="none">
        <!-- eyes -->
        @if (mood === 'celebrate') {
          <path d="M12 19 q3.2 -4 6.4 0" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/>
          <path d="M21.6 19 q3.2 -4 6.4 0" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/>
        } @else if (mood === 'think') {
          <circle cx="15.5" cy="16.5" r="2.6" fill="#fff"/>
          <circle cx="24.5" cy="16.5" r="2.6" fill="#fff"/>
        } @else {
          <circle cx="15" cy="18" r="2.7" fill="#fff"/>
          <circle cx="25" cy="18" r="2.7" fill="#fff"/>
        }
        <!-- mouth -->
        @if (mood === 'think') {
          <circle cx="20" cy="26" r="1.7" fill="#fff"/>
        } @else if (mood === 'celebrate') {
          <path d="M13 24 q7 8 14 0" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/>
        } @else {
          <path d="M14 25 q6 5 12 0" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/>
        }
        <!-- signature sparkle -->
        <path d="M32 7 l1 2.6 2.6 1 -2.6 1 -1 2.6 -1 -2.6 -2.6 -1 2.6 -1 z" fill="#fff" opacity="0.92"/>
      </svg>
    </span>
  `,
  styles: [`
    .pip-bob { animation: pipBob 2.6s ease-in-out infinite; }
    @keyframes pipBob {
      0%, 100% { transform: translateY(0) rotate(-2deg); }
      50%      { transform: translateY(-3px) rotate(2deg); }
    }
    @media (prefers-reduced-motion: reduce) { .pip-bob { animation: none; } }
  `],
})
export class PipMascotComponent {
  @Input() size = 40;
  @Input() mood: 'happy' | 'celebrate' | 'think' = 'happy';
  @Input() bob = true;
}
