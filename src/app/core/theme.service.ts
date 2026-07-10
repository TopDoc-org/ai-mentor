import { Injectable, signal } from '@angular/core';
import { isBrowser } from './platform';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  isLight = signal(false);

  constructor() {
    if (!isBrowser) return;
    const saved = localStorage.getItem('zenamaze_theme');
    if (saved === 'light') {
      document.documentElement.classList.add('light-mode');
      this.isLight.set(true);
    }
  }

  toggle() {
    if (!isBrowser) return;
    const html = document.documentElement;
    if (html.classList.contains('light-mode')) {
      html.classList.remove('light-mode');
      localStorage.setItem('zenamaze_theme', 'dark');
      this.isLight.set(false);
    } else {
      html.classList.add('light-mode');
      localStorage.setItem('zenamaze_theme', 'light');
      this.isLight.set(true);
    }
  }
}
