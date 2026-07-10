import { Component } from '@angular/core';
import { LegalLayoutComponent } from './legal-layout.component';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [LegalLayoutComponent],
  template: `
    <app-legal-layout
      heading="Terms & Conditions"
      path="/terms"
      lead="The rules for using Zenamaze."
      updated="July 2, 2026"
      description="The terms and conditions governing your use of the Zenamaze goals and productivity app.">

      <p>By using <strong>Zenamaze</strong> (the "Service") you agree to these Terms. If you do not agree, please do not use the Service.</p>

      <h2>Your account</h2>
      <p>You are responsible for keeping your login credentials secure and for activity under your account. Provide accurate information when you register.</p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Use the Service only for lawful personal goal‑setting and productivity.</li>
        <li>Do not attempt to disrupt, reverse‑engineer, or gain unauthorised access to the Service.</li>
        <li>Do not upload unlawful, harmful, or infringing content.</li>
      </ul>

      <h2>Your content</h2>
      <p>You retain ownership of the goals, notes and other content you create. You grant us the limited rights needed to store and display that content back to you as part of the Service.</p>

      <h2>Guidance, not professional advice</h2>
      <p>Zenamaze provides coaching and productivity guidance generated in part by AI. It is not professional, medical, legal or financial advice. See our <a href="/disclaimer">Disclaimer</a>.</p>

      <h2>Availability</h2>
      <p>The Service is provided "as is" and "as available". We may modify, suspend, or discontinue features at any time.</p>

      <h2>Limitation of liability</h2>
      <p>To the maximum extent permitted by law, Zenamaze is not liable for indirect or consequential losses arising from your use of the Service.</p>

      <h2>Changes</h2>
      <p>We may update these Terms; continued use after changes means you accept the updated Terms.</p>

      <h2>Contact</h2>
      <p>Questions? Email <a href="mailto:support&#64;zenamaze.knocdoc.in">support&#64;zenamaze.knocdoc.in</a> or use our <a href="/contact">Contact</a> page.</p>
    </app-legal-layout>
  `,
})
export class TermsComponent {}
