// True only in a real browser (not during server-side prerendering). Guards
// browser-only APIs (localStorage, window, document) so the app can be
// prerendered by @angular/ssr without throwing on the server.
export const isBrowser =
  typeof window !== 'undefined' && typeof document !== 'undefined';
