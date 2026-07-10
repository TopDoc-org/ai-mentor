import { Component, Input, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../shared/footer.component';
import { SeoService } from '../../core/seo.service';
import { environment } from '../../../environments/environment';

// Shared shell for every legal / informational page. Owns the branded header,
// breadcrumb, article container, footer, and — centrally — the per-page SEO
// metadata + BreadcrumbList/WebPage JSON-LD. Pages just supply inputs + body.
@Component({
  selector: 'app-legal-layout',
  standalone: true,
  imports: [RouterLink, FooterComponent],
  template: `
    <div class="min-h-screen flex flex-col">
      <header class="border-b border-white/10">
        <nav class="max-w-3xl mx-auto w-full flex items-center justify-between px-4 md:px-6 py-4">
          <a routerLink="/" class="flex items-center gap-2.5" aria-label="Zenamaze home">
            <img src="/icon.svg" alt="" class="h-8 w-8 rounded-xl object-cover">
            <span class="text-heading font-brand text-white tracking-tight">Zenamaze</span>
          </a>
          <a routerLink="/" class="text-body-sm text-slate-300 hover:text-white font-medium">← Back to home</a>
        </nav>
      </header>

      <main class="flex-1">
        <article class="max-w-3xl mx-auto w-full px-4 md:px-6 py-10 md:py-14">
          <!-- Breadcrumb -->
          <nav class="text-caption text-slate-500 mb-6" aria-label="Breadcrumb">
            <a routerLink="/" class="hover:text-slate-300">Home</a>
            <span class="mx-1.5">/</span>
            <span class="text-slate-300">{{ heading }}</span>
          </nav>

          <h1 class="font-heading text-display-lg md:text-display text-white leading-tight">{{ heading }}</h1>
          @if (lead) { <p class="text-body-lg text-slate-300/80 mt-4">{{ lead }}</p> }
          @if (updated) { <p class="text-caption text-slate-500 mt-3">Last updated: {{ updated }}</p> }

          <div class="legal-body mt-8">
            <ng-content />
          </div>
        </article>
      </main>

      <app-footer />
    </div>
  `,
  styles: [`
    :host ::ng-deep .legal-body h2 {
      color: #fff; font-weight: 700; font-size: 1.25rem; line-height: 1.35;
      margin: 2rem 0 0.75rem;
    }
    :host ::ng-deep .legal-body h3 {
      color: #e2e8f0; font-weight: 600; font-size: 1.05rem; margin: 1.5rem 0 0.5rem;
    }
    :host ::ng-deep .legal-body p,
    :host ::ng-deep .legal-body li {
      color: #cbd5e1; line-height: 1.7; font-size: 0.95rem;
    }
    :host ::ng-deep .legal-body p { margin: 0.75rem 0; }
    :host ::ng-deep .legal-body ul { list-style: disc; padding-left: 1.25rem; margin: 0.75rem 0; }
    :host ::ng-deep .legal-body li { margin: 0.35rem 0; }
    :host ::ng-deep .legal-body a { color: #9b83ff; text-decoration: underline; }
    :host ::ng-deep .legal-body a:hover { color: #b64dff; }
    :host ::ng-deep .legal-body strong { color: #f1f5f9; }
  `],
})
export class LegalLayoutComponent implements OnInit {
  private readonly seo = inject(SeoService);

  @Input({ required: true }) heading = '';
  @Input({ required: true }) path = '';
  @Input({ required: true }) description = '';
  @Input() lead = '';
  @Input() updated = '';
  @Input() keywords = '';

  ngOnInit(): void {
    const title = `${this.heading} · Zenamaze`;
    this.seo.update({
      title,
      description: this.description,
      keywords: this.keywords || undefined,
      path: this.path,
      robots: 'index, follow',
    });

    const url = `${environment.siteUrl}${this.path}`;
    this.seo.setJsonLd('ld-breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${environment.siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: this.heading, item: url },
      ],
    });
    this.seo.setJsonLd('ld-webpage', {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description: this.description,
      url,
      isPartOf: { '@id': `${environment.siteUrl}/#website` },
    });
  }
}
