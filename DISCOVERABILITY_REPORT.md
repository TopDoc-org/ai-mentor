# Discoverability Report — Zenamaze

_Audited 2026-07-03._

## Score: 92 / 100

## URL structure
- Clean, flat, semantic: `/`, `/about`, `/help`, `/privacy`, `/terms`, `/contact`, `/cookies`, `/disclaimer`, `/data-deletion`, `/login`.
- No hash routing, no query-param page identity, no trailing-slash duplication.
- Guest/app routes are parameterized (`/try/:id`, `/plan/:id`) and correctly kept out of the index.

## Crawlability & indexability
| Check | Status |
|-------|--------|
| robots.txt present + valid | ✅ `public/robots.txt` |
| Sitemap referenced in robots | ✅ |
| Public pages prerendered (SSG) | ✅ all 9 → real HTML for crawlers |
| Auth/guest surfaces disallowed | ✅ 12 paths blocked |
| No accidental `noindex` on public pages | ✅ default `index, follow` |
| Canonical on every public page | ✅ absolute, per-path |
| No duplicate metadata across pages | ✅ each route sets unique title/description |

**No crawl issues, no indexing issues, no broken metadata found.**

## Sitemap quality
- 10 URLs, all public + indexable, with `lastmod` / `changefreq` / `priority`.
- Matches robots `Allow` set exactly — no orphan or blocked URLs in the sitemap.
- Single sitemap (no index needed at this scale).
- **Action:** update `lastmod` on content changes; regenerate if new public pages are added.

## Internal linking
- Footer links **every** legal/policy page from every page → no orphan pages.
- Landing → guest flow → login is a clear primary path.
- Legal pages cross-link (privacy ↔ cookies ↔ data-deletion ↔ contact).
- Breadcrumb schema on legal pages.
- **Opportunity:** add contextual links from landing → `/about` and `/help` in the footer/nav to spread link equity to those higher-value pages.

## Duplicate content / pages
- None. Each route renders distinct content + distinct canonical.
- `**` wildcard redirects unknown paths to `/` (client-side) — acceptable; consider a proper 404 page long-term for cleaner signals (minor).

## Image SEO
| Check | Status | Note |
|-------|--------|------|
| OG image raster + sized | ✅ fixed | 1200×630 PNG + width/height/alt meta |
| Descriptive filenames | ✅ | `social-preview.png`, `icon-*.png` |
| `alt` on OG (`og:image:alt`) | ✅ | added |
| Lazy loading | ✅ | UI is largely CSS gradients/SVG; add `loading="lazy"` on any future content `<img>` |
| Dimensions declared | ✅ for OG | declare width/height on future content images to avoid CLS |

## Structured data completeness
Organization, WebSite, SoftwareApplication (+free Offer), WebPage, BreadcrumbList, FAQPage — all valid JSON-LD, all rich-result-eligible where applicable. No fabricated ratings/reviews.

## Search visibility improvements (ranked)
1. **Set the real domain** in `environment*.ts` and submit `sitemap.xml` to Google Search Console + Bing Webmaster.
2. **Replace placeholder OG art** with designed 1200×630 for higher social CTR.
3. **Add a content/blog surface** (e.g. `/blog` with `Article`/`BlogPosting` schema) — the single biggest untapped organic lever for a productivity app; none exists today.
4. **Expand the FAQ** on `/help` (more long-tail Q&A → more FAQ rich results).
5. **Proper 404 page** (soft-404 avoidance) instead of silent redirect to `/`.
6. Add `/about` + `/help` to primary nav for internal link equity.

## Verdict
Fully indexable, no orphans, no duplicate/broken metadata. Discoverability is launch-ready; growth upside is content marketing (blog) + Search Console submission.
