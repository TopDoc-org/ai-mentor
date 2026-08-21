import { RenderMode, ServerRoute } from '@angular/ssr';

// Prerender (SSG) render modes. Public, parameter-free pages are prerendered to
// static HTML at build time so crawlers and social scrapers get real content.
// Everything else (auth-gated app, parameterised guest routes) stays client-
// rendered — the Capacitor Android build boots the same CSR shell as before.
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'login', renderMode: RenderMode.Prerender },
  { path: 'privacy', renderMode: RenderMode.Prerender },
  { path: 'terms', renderMode: RenderMode.Prerender },
  { path: 'data-deletion', renderMode: RenderMode.Prerender },
  { path: 'contact', renderMode: RenderMode.Prerender },
  { path: 'about', renderMode: RenderMode.Prerender },
  { path: 'help', renderMode: RenderMode.Prerender },
  { path: 'disclaimer', renderMode: RenderMode.Prerender },
  { path: 'cookies', renderMode: RenderMode.Prerender },
  // Outbound funnel page. Prerendered because there is no hosting rewrite config
  // in this repo: a cold ad click on /guide resolves only if the build emits
  // dist/web/browser/guide/index.html.
  { path: 'guide', renderMode: RenderMode.Prerender },
  // Auth-gated + parameterised routes: client-side render only.
  { path: '**', renderMode: RenderMode.Client },
];
