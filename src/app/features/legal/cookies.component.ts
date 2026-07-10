import { Component } from '@angular/core';
import { LegalLayoutComponent } from './legal-layout.component';

@Component({
  selector: 'app-cookies',
  standalone: true,
  imports: [LegalLayoutComponent],
  template: `
    <app-legal-layout
      heading="Cookie Policy"
      path="/cookies"
      lead="How Zenamaze uses cookies and local storage."
      updated="July 2, 2026"
      description="How Zenamaze uses browser local storage and cookies for essential functionality and optional analytics.">

      <p>This policy explains how <strong>Zenamaze</strong> uses local storage and cookies.</p>

      <h2>Essential storage</h2>
      <p>Zenamaze stores small pieces of data in your browser's local storage to run the app — for example your authentication token (to keep you signed in), your theme preference, sound settings, and a same‑day cache of reminders. Without these, core features would not work.</p>

      <h2>Analytics</h2>
      <p>When analytics are enabled, we use privacy‑respecting, aggregated measurement (Google Analytics / Firebase Analytics) to understand how the Service is used and to improve it. This data is not used to sell your information or serve third‑party ads.</p>

      <h2>Managing your choices</h2>
      <ul>
        <li>Clear your browser's site data to remove locally stored values (this will sign you out).</li>
        <li>On mobile, uninstalling the app clears its local storage.</li>
      </ul>

      <p>For more on how we handle data, see our <a href="/privacy">Privacy Policy</a>.</p>
    </app-legal-layout>
  `,
})
export class CookiesComponent {}
