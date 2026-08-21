// Dev environment. `ng build` replaces this with environment.prod.ts
// via the fileReplacements array in angular.json.
export const environment = {
  production: false,
  // Base host of the backend. Mentor routes are mounted at /mentor (backend
  // path unchanged during the Zenamaze rebrand — see TopDoc-Backend).
  // LAN IP (not localhost) so a phone on the same WiFi can reach the backend.
  serverUrl: 'http://localhost:3000',
  // Public web origin — used for canonical URLs, sitemap and OG/Twitter absolute
  // URLs.
  siteUrl: 'https://zenamaze.knocdoc.in',
  // Firebase Analytics (GA4). Fill from the Firebase console to enable tracking;
  // while these stay blank the AnalyticsService is a no-op. Not secret (client
  // config), but keep real values out of source control if you prefer.
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    measurementId: '',
  },
};
