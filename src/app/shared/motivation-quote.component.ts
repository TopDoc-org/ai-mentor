import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuotesService, Quote } from '../core/quotes.service';

// Decorative, single motivational quote — plain static text (no typewriter).
// Picks one quote for the given themes and shows it in full. Reusable anywhere.
@Component({
  selector: 'app-motivation-quote',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="text-center select-none" aria-hidden="true" [class.opacity-0]="!text()">
      <p class="text-body-sm md:text-body text-slate-300 italic leading-relaxed">
        {{ text() }}
      </p>
      <p class="text-caption text-slate-500 mt-1" [class.opacity-0]="!author()">— {{ author() }}</p>
    </div>
  `,
})
export class MotivationQuoteComponent implements OnInit {
  @Input() themes: string[] = ['focus', 'persistence', 'leverage', 'habit'];

  text = signal('');
  author = signal('');

  constructor(private quotesSvc: QuotesService) {}

  ngOnInit(): void {
    this.quotesSvc.forThemes(this.themes).subscribe((list) => {
      if (!list.length) return;
      const q: Quote = list[Math.floor(Math.random() * list.length)];
      this.text.set(q.text);
      this.author.set(q.author);
    });
  }
}
