import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.knocdoc.zenamaze',
  appName: 'Zenamaze',
  webDir: 'dist/web/browser',
  // DEV ONLY: allow the WebView (served over https://localhost) to call the
  // local HTTP backend on the LAN. REMOVE both before a Play release — the
  // production backend is HTTPS and cleartext should stay off in shipped builds.
  server: {
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    // Splash matches the dark brand background; short timeout, faded out from JS.
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#08090d',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#7c5cff',
    },
  },
};

export default config;
