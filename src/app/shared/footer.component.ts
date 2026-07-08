import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Site footer for public pages (landing + legal). Provides crawlable internal
// links to every legal/marketing page — Play Store requires a reachable Privacy
// Policy, and search engines reward complete internal linking.
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="border-t border-white/10 mt-16">
      <div class="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-12">
        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          <div class="max-w-xs">
            <a routerLink="/" class="flex items-center gap-2.5" aria-label="Zenamaze home">
              <img src="icon.svg" alt="" class="h-8 w-8 rounded-xl object-cover">
              <span class="text-heading font-brand text-white tracking-tight">Zenamaze</span>
            </a>
            <p class="text-body-sm text-slate-400 mt-3">
              Turn one big goal into a single daily action — and actually get there.
            </p>
          </div>

          <nav class="grid grid-cols-2 sm:grid-cols-3 gap-x-10 gap-y-2" aria-label="Footer">
            <a routerLink="/about" class="text-body-sm text-slate-400 hover:text-white">About</a>
            <a routerLink="/help" class="text-body-sm text-slate-400 hover:text-white">Help &amp; Support</a>
            <a routerLink="/contact" class="text-body-sm text-slate-400 hover:text-white">Contact</a>
            <a routerLink="/privacy" class="text-body-sm text-slate-400 hover:text-white">Privacy</a>
            <a routerLink="/terms" class="text-body-sm text-slate-400 hover:text-white">Terms</a>
            <a routerLink="/cookies" class="text-body-sm text-slate-400 hover:text-white">Cookies</a>
            <a routerLink="/data-deletion" class="text-body-sm text-slate-400 hover:text-white">Data deletion</a>
            <a routerLink="/disclaimer" class="text-body-sm text-slate-400 hover:text-white">Disclaimer</a>
          </nav>
        </div>

        <p class="text-caption text-slate-500 mt-10">
          © {{ year }} Zenamaze. All rights reserved.
        </p>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
}
