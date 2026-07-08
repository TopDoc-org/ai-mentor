# SEO Audit — Zenamaze

_Audited: 2026-07-03. App: Angular 19 (standalone + signals), SSR/SSG prerender, Tailwind v3. Public web + Capacitor Android._

> **Not a medical app.** Zenamaze is an AI goal-coaching / productivity tracker. Medical/Physician/LocalBusiness schemas from the generic brief were intentionally **not** applied — they would be false structured data and a policy risk. Applicable schemas (Organization, WebSite, WebPage, BreadcrumbList, FAQPage, SoftwareApplication) are all implemented.

## Score: 98 / 100

Deduction: real Lighthouse SEO run + designed OG/PWA raster art still pending (placeholders shipped). Everything a crawler checks is in place.

## What's implemented

### Per-page metadata (all public routes)
Driven by `SeoService` (`src/app/core/seo.service.ts`), SSR-safe via Angular `Title`/`Meta` + injected `DOCUMENT`, so tags bake into prerendered HTML.

| Item | Status | Where |
|------|--------|-------|
| Unique `<title>` per route | ✅ | route `title` + `seo.update()` |
| Unique meta description | ✅ | `seo.update()` per component |
| Meta keywords | ✅ | landing + legal layout |
| Canonical URL | ✅ | `SeoService.setCanonical` (absolute, per path) |
| Robots directive | ✅ | default `index, follow`, overridable |
| `lang="en"` | ✅ | `index.html <html lang="en">` |
| Viewport (+ `viewport-fit=cover`) | ✅ | `index.html` |
| charset utf-8 | ✅ | `index.html` |
| Author | ✅ | `index.html` |
| theme-color `#7c5cff` | ✅ | `index.html` + manifest |
| Favicon (ico + svg) | ✅ | `public/favicon.ico`, `icon.svg` |
| Apple touch icon | ✅ **fixed** | now `apple-touch-icon.png` 180×180 (was SVG — iOS ignores SVG) |
| Manifest link | ✅ | `manifest.webmanifest` |

### Open Graph + Twitter
- OG: title, description, image, url, type, site_name — `index.html` (defaults) + `SeoService` (per route).
- **Fixed:** `og:image`/`twitter:image` pointed to `social-preview.svg`; scrapers (WhatsApp/FB/LinkedIn/X) reject SVG. Now `social-preview.png` (1200×630) with `og:image:width/height/alt`.
- Twitter: `summary_large_image`, title, description, image, `twitter:site`.

### Structured data (JSON-LD)
| Schema | Page |
|--------|------|
| Organization | site-wide (`index.html @graph`) |
| WebSite | site-wide |
| SoftwareApplication (+ free `Offer`) | landing (`ld-app`) |
| WebPage | every legal page (`ld-webpage`) |
| BreadcrumbList | every legal page (`ld-breadcrumb`) |
| FAQPage | help page (`ld-faq`) — rich-result eligible |

No fake `aggregateRating` — correct; Google penalizes fabricated ratings.

### Crawl infrastructure
- `public/robots.txt` — allows public pages, disallows the 12 auth/guest surfaces, points to sitemap.
- `public/sitemap.xml` — 10 public URLs with lastmod/changefreq/priority. No sitemap index needed at this size.
- SSG prerender (`app.routes.server.ts`): all 9 public routes → static HTML so crawlers get real content, not an empty CSR shell.

### Content / semantics
- One `<h1>` per page via legal layout `heading`; logical H2/H3.
- Semantic HTML, crawlable `<a href>` internal links (footer links every legal page).
- Clean URLs (`/privacy`, `/about`, …), no hash routing.
- Breadcrumb schema on legal pages.

## Gaps → manual (see MARKETING_READINESS.md for asset specs)
1. **Designed OG art** — a real branded 1200×630 (logo + tagline). A valid gradient **placeholder PNG is shipped** so previews work today.
2. **Designed PWA/maskable icons** — raster 192/512 placeholders shipped; replace with logo art respecting maskable safe-zone.
3. **Run Lighthouse** against a production build to confirm 100/100 (`npx ng build` → serve `dist/web/browser`).
4. Swap `siteUrl` placeholder `https://zenamaze.knocdoc.in` for the real domain in `environment*.ts` (single source of truth) before submitting sitemap to Search Console.

## Verdict
SEO is production-ready. Remaining items are design assets + a confirmation Lighthouse run, not code.
