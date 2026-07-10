import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

export interface Quote {
  id?: string;
  text: string;
  author: string;
  theme: string;
  useWhen?: string[];
}
interface QuoteFile {
  quotes: Quote[];
}

// A couple of quotes to fall back on if the asset fails to load, so any quote
// UI is never left empty.
const FALLBACK: Quote[] = [
  { text: 'Until my ONE Thing is done — everything else is a distraction.', author: 'Gary Keller & Jay Papasan', theme: 'focus' },
  { text: 'Success is built sequentially. It\'s one thing at a time.', author: 'Gary Keller & Jay Papasan', theme: 'persistence' },
];

@Injectable({ providedIn: 'root' })
export class QuotesService {
  private http = inject(HttpClient);

  // Static asset served at app origin (public/ → build root). Loaded once.
  private quotes$: Observable<Quote[]> = this.http
    .get<QuoteFile>('/zenamaze-quotes.json')
    .pipe(
      map((f) => (f && Array.isArray(f.quotes) && f.quotes.length ? f.quotes : FALLBACK)),
      catchError(() => of(FALLBACK)),
      shareReplay(1)
    );

  // Quotes matching any of the given themes, shuffled. Empty `themes` = all.
  forThemes(themes: string[] = []): Observable<Quote[]> {
    return this.quotes$.pipe(
      map((all) => {
        const picked = themes.length ? all.filter((q) => themes.includes(q.theme)) : all;
        const list = picked.length ? picked : all;
        return shuffle(list);
      })
    );
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
