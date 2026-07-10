import { Injectable } from '@angular/core';

export interface SharePayload {
  url: string; // the public unfurl link (rich preview + install CTA)
  title: string;
  text: string;
}

// Sharing without any extra dependency: the native Web Share sheet where
// available (mobile / Capacitor WebView), with WhatsApp/X/copy fallbacks that
// all point at the backend unfurl link — which itself carries the OG image card.
@Injectable({ providedIn: 'root' })
export class ShareService {
  get canNativeShare(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  }

  async native(p: SharePayload): Promise<boolean> {
    if (!this.canNativeShare) return false;
    try {
      await navigator.share({ title: p.title, text: p.text, url: p.url });
      return true;
    } catch {
      // User cancelled or share failed — caller can fall back to a menu.
      return false;
    }
  }

  whatsapp(p: SharePayload): void {
    this.open(`https://wa.me/?text=${encodeURIComponent(`${p.text} ${p.url}`)}`);
  }

  twitter(p: SharePayload): void {
    this.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(p.text)}&url=${encodeURIComponent(p.url)}`
    );
  }

  async copy(url: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  }

  private open(url: string): void {
    if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener');
  }
}
