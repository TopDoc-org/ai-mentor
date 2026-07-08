# Marketing Readiness — Zenamaze

_Audited 2026-07-03. Brand: violet `#7c5cff` on dark `#08090d`; premium glassmorphism + gradient; handwritten accent fonts (Caveat, Permanent Marker)._

## Readiness: 85 / 100
Metadata, sharing tags, and PWA/social plumbing are complete and consistent. Remaining work is **designed raster art** replacing shipped functional placeholders.

## Assets

| Asset | Status | File | Spec |
|-------|--------|------|------|
| Favicon (ico) | ✅ | `public/favicon.ico` | multi-size |
| Favicon (svg) | ✅ | `public/icon.svg` | scalable |
| Apple touch icon | ✅ placeholder | `public/apple-touch-icon.png` | 180×180 — replace w/ logo |
| PWA icon 192 | ✅ placeholder | `public/icon-192.png` | 192×192 |
| PWA icon 512 | ✅ placeholder | `public/icon-512.png` | 512×512 |
| Maskable icons | ✅ placeholder | 192/512 in manifest | keep logo inside 80% safe-zone |
| OG / social image | ✅ placeholder | `public/social-preview.png` | 1200×630 |
| Twitter image | ✅ | reuses `social-preview.png` | `summary_large_image` |

> Placeholders are **valid brand-gradient PNGs** (generated), so every share surface renders correctly today. Swap for designed art (logo + tagline "Turn one big goal into one move today") before a paid launch push. SVG versions exist as source but are **not** used for OG/Play — those surfaces reject SVG.

## Social sharing preview — covered per platform
| Platform | Mechanism | Status |
|----------|-----------|--------|
| WhatsApp / Telegram | OG title/description/image (1200×630 PNG) | ✅ |
| Facebook | Open Graph | ✅ |
| LinkedIn | Open Graph | ✅ |
| X (Twitter) | `summary_large_image` + `twitter:site` | ✅ |

All resolve from prerendered HTML, so scrapers get real tags without executing JS.

## Brand consistency
- Single source of truth for `theme_color` / `background_color` (manifest, index.html, capacitor splash) — all `#7c5cff` / `#08090d`.
- `siteUrl` centralized in `environment*.ts` for all canonical/OG absolute URLs.
- Logo usage: `icon.svg` (favicon/PWA). **Action:** ensure the same mark is used across store listing, OG art, and touch icons.

---

## Launch Checklist
- [ ] Replace placeholder raster art (OG 1200×630, icons 192/512/180) with designed versions
- [ ] Swap `siteUrl` placeholder domain → real domain (`environment.ts` + `environment.prod.ts`)
- [ ] Firebase config populated → analytics live
- [ ] Google Search Console verified + sitemap submitted
- [ ] Production Lighthouse run (SEO/PWA/Perf) archived

## Website Checklist
- [x] Public landing with clear value prop + CTA (guest try)
- [x] All legal pages linked in footer
- [x] Mobile-friendly, responsive
- [x] Canonical URLs, OG, Twitter, JSON-LD
- [ ] Real domain + HTTPS + hosting for `dist/web/browser`

## Play Store Checklist
See `PLAYSTORE_CHECKLIST.md`. Blockers: keystore, store graphics, data-safety form.

## SEO Checklist
See `SEO_AUDIT.md`. Status: production-ready (98/100).

## Branding Checklist
- [x] Consistent brand colors across web + native
- [x] Favicon set (ico + svg)
- [ ] Designed logo lockup for store + OG
- [x] Handwritten accent fonts loaded

## Content Checklist
- [x] Landing copy
- [x] All policy/legal copy
- [x] Help FAQ (5 Q&A, FAQPage schema)
- [ ] Store short (80 char) + full (4000 char) description
- [ ] 2–8 phone screenshots + optional promo video

## Analytics Checklist
See `ANALYTICS_PLAN.md`. Infra ready; add Firebase keys + wire remaining domain events.

## Copy starters (for store listing)
- **Tagline:** Turn one big goal into one move today.
- **Short:** An AI coach that finds your real "why", builds the system, and hands you one daily action — with streaks and reminders that make it hurt to skip.
