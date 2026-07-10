import { Injectable, signal } from '@angular/core';

// Short UI cue sounds for the focus timer. Bundled WAVs under public/sounds
// (copied into the build + the APK by Capacitor), played via HTMLAudioElement so
// the exact same code works in the web app and the Android WebView.
//
// Autoplay: the first cue (`start`) is triggered by the user's tap on the start
// button, which unlocks audio for the later timer-driven `finish` / `win` in the
// same session.
export type SoundName = 'start' | 'finish' | 'win';

const MUTE_KEY = 'zenamaze.sound.muted';

@Injectable({ providedIn: 'root' })
export class SoundService {
  muted = signal(this.readMuted());
  private els = new Map<SoundName, HTMLAudioElement>();

  private readMuted(): boolean {
    try {
      return localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      return false;
    }
  }

  // Resolve against the document base so it works under any deploy path and in
  // the WebView (https://localhost / file://).
  private urlFor(name: SoundName): string {
    return new URL(`sounds/${name}.wav`, document.baseURI).href;
  }

  private el(name: SoundName): HTMLAudioElement {
    let a = this.els.get(name);
    if (!a) {
      a = new Audio(this.urlFor(name));
      a.preload = 'auto';
      a.volume = 0.6;
      this.els.set(name, a);
    }
    return a;
  }

  play(name: SoundName): void {
    if (this.muted()) return;
    try {
      const a = this.el(name);
      a.currentTime = 0;
      // Ignore rejections (e.g. autoplay blocked) — a missing cue must never throw.
      void a.play().catch(() => {});
    } catch {
      /* no-op */
    }
  }

  // Persistent looping cue (the finish alarm) — repeats until stopLoop().
  startLoop(name: SoundName): void {
    if (this.muted()) return;
    try {
      const a = this.el(name);
      a.loop = true;
      a.currentTime = 0;
      void a.play().catch(() => {});
    } catch {
      /* no-op */
    }
  }

  stopLoop(name: SoundName): void {
    try {
      const a = this.el(name);
      a.loop = false;
      a.pause();
      a.currentTime = 0;
    } catch {
      /* no-op */
    }
  }

  toggleMute(): void {
    const next = !this.muted();
    this.muted.set(next);
    try {
      localStorage.setItem(MUTE_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  }
}
