import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeoService } from '../../core/seo.service';
import { AnalyticsService } from '../../core/analytics.service';
import { AnalyticsEvent } from '../../core/analytics-events';
import { isBrowser } from '../../core/platform';

/**
 * Outbound funnel landing page (`/guide`). Carries DoctoGuide branding only and
 * hands the visitor straight to DoctoGuide with whatever they typed.
 *
 * Two constraints on this file, both deliberate:
 *
 * 1. COPY. Google classifies a landing page into the "health" sensitive interest
 *    category from personal-health signals: named conditions or symptoms,
 *    second-person symptom framing, medicines, procedures. A page carrying those
 *    signals keeps serving, but personalised-advertising targeting is restricted.
 *    So none of that vocabulary may appear in the rendered HTML — in any
 *    language, and in either direction. A denial ("not medical advice") carries
 *    the same words as a claim, and the classifier reads words, not intent.
 *    Every string here is lifted from DoctoGuide's own already-scrubbed /start
 *    page; never copy from its symptom-led homepage.
 *
 * 2. LOOK. This is a DoctoGuide page living inside the Zenamaze app, so it opts
 *    out of the Zenamaze dark theme entirely: DoctoGuide's cream/teal palette as
 *    arbitrary hex values (extending tailwind.config.js would repaint teal-* for
 *    the whole app) and its three fonts scoped to this component. styles.scss
 *    sets h1/h2 white, p slate-200 and a accent-purple in @layer base, so every
 *    heading, paragraph and link below needs an explicit text-[...] utility --
 *    utilities outrank base, but only if they are actually present.
 */
@Component({
  selector: 'app-guide',
  standalone: true,
  imports: [FormsModule],
  styles: [
    `
      /* Only the weights this page actually paints: Outfit 800 (wordmark),
         DM Sans 400/500/600/800 (body, buttons, the KnocDoc lockup), Fraunces
         regular + italic (hero). Every extra weight is inlined into the
         prerendered HTML of an ad landing page, so it is paid on first paint.

         The build prints an anyComponentStyle budget warning for this file
         (~6.4 kB against a 4 kB warn / 8 kB error threshold in angular.json).
         That is expected and worth it: the @font-face blocks get inlined into
         the prerendered HTML, so the page paints its fonts with no extra
         round-trip to fonts.googleapis.com. Adding a fourth family would push
         it past the error ceiling — trim weights before adding anything. */
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@800&family=DM+Sans:wght@400;500;600;800&family=Fraunces:ital,opsz,wght@0,9..144,400;1,9..144,400&display=swap');

      /* The page paints its own ground: body is ink-950, and overscroll would
         otherwise flash dark above a cream page. */
      :host {
        display: block;
        background: #fafaf2;
      }

      .fh { font-family: 'Outfit', ui-sans-serif, system-ui, sans-serif; }
      .fb { font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif; }
      .fd { font-family: 'Fraunces', Georgia, serif; }
    `,
  ],
  template: `
    <div class="relative min-h-screen overflow-hidden bg-[#FAFAF2]">
      <!-- decorative blob -->
      <div
        class="pointer-events-none absolute left-1/2 top-0 -z-0 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-40 blur-3xl"
        style="background: radial-gradient(circle at 30% 30%, #2DD4BF, #0D9488 40%, #2563eb 80%);"
      ></div>

      <header class="relative z-10">
        <nav aria-label="Primary" class="mx-auto flex max-w-3xl items-center justify-between gap-2 px-5 py-5 sm:px-6">
          <div class="flex min-w-0 shrink flex-col leading-tight">
            <div class="fh flex items-center gap-1 truncate text-xl font-extrabold text-[#0A332F] sm:text-2xl">
              <span class="truncate">DoctoGuide</span>
              <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0 text-[#14B8A6]" fill="currentColor" aria-hidden="true">
                <path d="M12 2.5l1.9 5.1 5.1 1.9-5.1 1.9L12 16.5l-1.9-5.1L5 9.5l5.1-1.9L12 2.5Zm6.5 11l.95 2.55 2.55.95-2.55.95L18.5 20.5l-.95-2.55L15 17l2.55-.95.95-2.55Z" />
              </svg>
            </div>
            <span class="fb flex items-center gap-1 truncate text-[11px] font-semibold text-[#0A332F]/50">
              powered by
              <span class="font-extrabold"><span style="color:#0a1480">Knoc</span><span style="color:#4fb0f9">Doc</span></span>
            </span>
          </div>
          <button
            type="button"
            (click)="start('hero')"
            class="fb shrink-0 rounded-full bg-[#0A332F] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#0F766E]"
          >
            Start free
          </button>
        </nav>
      </header>

      <main class="relative z-10 mx-auto max-w-3xl px-5 pb-16 sm:px-6">
        <section class="pt-8 text-center md:pt-14">
          <h1 class="fd text-[2rem] leading-[1.1] text-[#0A332F] sm:text-5xl">
            Know <span class="italic">who to book</span><br class="hidden sm:block" />
            before you book
          </h1>

          <p class="fb mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#0A332F]/75 sm:text-lg">
            DoctoGuide is a free tool from KnocDoc. Tell it what you're looking for in plain
            language, and it helps you narrow down the right kind of professional to book with —
            then shows you listings near you. No sign-up, no card.
          </p>

          <!-- Entry box. Free text is handed to DoctoGuide as \`q\`. Read the copy
               rule in the class comment above before editing any string here. -->
          <div class="mx-auto mt-8 w-full max-w-xl">
            <p class="fb mb-2.5 text-center text-sm font-semibold text-[#0A332F]">What are you looking for?</p>
            <div class="flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-black/5 sm:flex-row sm:items-center">
              <div class="flex flex-1 items-center gap-2 px-3">
                <!-- Material chat_bubble_outline, inlined: the same glyph DoctoGuide
                     shows here, without pulling in the whole icon font. -->
                <svg viewBox="0 0 24 24" class="h-5 w-5 shrink-0 text-[#14B8A6]" fill="currentColor" aria-hidden="true">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
                </svg>
                <input
                  [(ngModel)]="query"
                  (keyup.enter)="start('hero')"
                  [placeholder]="placeholder"
                  aria-label="Tell us what you are looking for"
                  class="fb h-12 w-full bg-transparent text-base text-[#0A332F] outline-none placeholder:text-[#0A332F]/40"
                />
              </div>
              <button
                type="button"
                (click)="start('hero')"
                class="fb flex h-12 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#0D9488] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#0F766E] sm:w-auto"
              >
                Get started
                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M5 12h14m-6-6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>

            <p class="fb mt-3 text-center text-sm text-[#0A332F]/60">
              Free · No sign-up · Type in any language — English · हिन्दी · Hinglish.
            </p>
          </div>
        </section>

        <footer class="fb mx-auto mt-16 max-w-xl border-t border-[#0A332F]/10 pt-5 text-center text-xs text-[#0A332F]/50">
          <a href="https://doctoguide.knocdoc.in/privacy" rel="noopener" class="text-[#0A332F]/50 hover:text-[#0F766E]">Privacy Policy</a>
          <span class="mx-2">·</span>
          <a href="https://doctoguide.knocdoc.in/terms" rel="noopener" class="text-[#0A332F]/50 hover:text-[#0F766E]">Terms of Use</a>
          <span class="mx-2">·</span>
          <a href="https://doctoguide.knocdoc.in/disclaimer" rel="noopener" class="text-[#0A332F]/50 hover:text-[#0F766E]">Disclaimer</a>
          <span class="mx-2">·</span>
          <a href="https://doctoguide.knocdoc.in/contact" rel="noopener" class="text-[#0A332F]/50 hover:text-[#0F766E]">Contact</a>

          <p class="mt-3 text-xs leading-relaxed text-[#0A332F]/50">
            DoctoGuide is operated by <strong class="font-semibold text-[#0A332F]/70">KnocDoc</strong>.
            Support:
            <a href="mailto:support&#64;knocdoc.in" class="text-[#0A332F]/50 underline hover:text-[#0F766E]">support&#64;knocdoc.in</a>
          </p>
        </footer>
      </main>
    </div>
  `,
})
export class GuideComponent implements OnInit, OnDestroy {
  private readonly seo = inject(SeoService);
  private readonly analytics = inject(AnalyticsService);
  private readonly doc = inject(DOCUMENT);

  /** Where the funnel lands. */
  private static readonly TARGET = 'https://doctoguide.knocdoc.in/triage';

  query = '';
  placeholder = '';

  /**
   * Rotating placeholder examples. Every line asks which *kind of professional*
   * the visitor wants — the directory question — and none names a condition,
   * a body part, a medicine or a lab report, in any language. Anything else puts
   * this page back into Google's health interest category.
   */
  readonly useCases = [
    'Which kind of professional should I book with?',
    'Mujhe kis type ke professional ko dhundhna chahiye?',
    'Show me the options available near me',
    'मुझे किस तरह के पेशेवर की तलाश है?',
    'Find listings close by, open today',
  ];

  private phIndex = 0;
  private phTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.seo.update({
      title: 'DoctoGuide by KnocDoc — Know Who to Book',
      description:
        'Free tool from KnocDoc. Tell it what you are looking for in plain language, see which options could fit, and find listings near you. No sign-up, no card.',
      path: '/guide',
      robots: 'noindex, nofollow',
      // Absolute URL — SeoService.abs() passes http(s) through untouched, so the
      // card is DoctoGuide's neutral one, not Zenamaze's social preview.
      image: 'https://doctoguide.knocdoc.in/assets/og-start.png',
    });

    this.neutraliseHead();

    if (isBrowser) {
      // Self-rescheduling macrotask loop — it would keep the app from ever
      // becoming stable during prerender, so it is browser-only.
      this.typePlaceholder();
    } else {
      this.placeholder = this.useCases[0];
    }
  }

  ngOnDestroy(): void {
    if (this.phTimer) clearTimeout(this.phTimer);
  }

  /**
   * index.html bakes a site-wide head into every prerendered route, and on this
   * page most of it belongs to the wrong product. Dropped:
   *   - the Organization JSON-LD graph — structured data is exactly the
   *     machine-readable signal this page exists to avoid, and none is added back;
   *   - the manifest link, which offers to install the other app;
   *   - the image alt text and Twitter handle, which describe a social card this
   *     page does not use (og:image points at DoctoGuide's own card);
   *   - author / apple-mobile-web-app-title, both visible on save-to-homescreen.
   * og:url and canonical stay as they are: the page really does live on this domain.
   */
  private neutraliseHead(): void {
    this.doc.head.querySelectorAll('script[type="application/ld+json"]').forEach((n) => n.remove());
    this.doc.head.querySelector('link[rel="manifest"]')?.remove();
    [
      'meta[property="og:image:alt"]',
      'meta[name="twitter:image:alt"]',
      'meta[name="twitter:site"]',
      'meta[name="author"]',
      'meta[name="apple-mobile-web-app-title"]',
    ].forEach((sel) => this.doc.head.querySelector(sel)?.remove());
    // SeoService.update() stamps og:site_name with the host app's name.
    this.doc.head
      .querySelector('meta[property="og:site_name"]')
      ?.setAttribute('content', 'DoctoGuide');
  }

  /** Which CTA earned the click. */
  start(source: 'hero' | 'foot'): void {
    const q = (this.query || '').trim();
    this.analytics.logEvent(AnalyticsEvent.GuideCtaClick, { source, typed: q ? 1 : 0 });
    if (!isBrowser) return;
    // Same tab: a funnel should not leave an orphan tab behind.
    window.location.href = q
      ? `${GuideComponent.TARGET}?q=${encodeURIComponent(q)}`
      : GuideComponent.TARGET;
  }

  // Typewriter for the input placeholder: type a use-case, pause, erase, next.
  private typePlaceholder(): void {
    const full = this.useCases[this.phIndex] || '';
    if (this.placeholder.length < full.length) {
      this.placeholder = full.slice(0, this.placeholder.length + 1);
      this.phTimer = setTimeout(() => this.typePlaceholder(), 55);
      return;
    }
    this.phTimer = setTimeout(() => this.erasePlaceholder(), 1800);
  }

  private erasePlaceholder(): void {
    if (this.placeholder.length > 0) {
      this.placeholder = this.placeholder.slice(0, -1);
      this.phTimer = setTimeout(() => this.erasePlaceholder(), 30);
      return;
    }
    this.phIndex = (this.phIndex + 1) % this.useCases.length;
    this.phTimer = setTimeout(() => this.typePlaceholder(), 250);
  }
}
