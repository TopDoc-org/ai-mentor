// Production environment (used for APK builds).
// TODO: update serverUrl to the deployed backend host.
export const environment = {
  production: true,
  // Base host of the backend. Mentor routes are mounted at /mentor (backend
  // path unchanged during the Zenamaze rebrand — see TopDoc-Backend).
  serverUrl: 'https://backend.knocdoc.in',
// Public web origin — used for canonical URLs, sitemap and OG/Twitter absolute
  // URLs.
  siteUrl: 'https://zenamaze.knocdoc.in',
  // Firebase Analytics (GA4). Fill from the Firebase console to enable tracking;
  // while these stay blank the AnalyticsService is a no-op.
  firebase: {
    apiKey: 'AIzaSyCLmlvmHl0ka6fwsdPfhKCLCQsqSpe66YU',
    authDomain: 'goalmentor-7a13b.firebaseapp.com',
    projectId: 'goalmentor-7a13b',
    storageBucket: 'goalmentor-7a13b.firebasestorage.app',
    messagingSenderId: '858444217346',
    appId: '1:858444217346:web:d66b1b25d6c644c997fb1b',
    measurementId: 'G-428HDWM23X',
  },
};
