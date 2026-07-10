import { Component } from '@angular/core';
import { LegalLayoutComponent } from './legal-layout.component';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [LegalLayoutComponent],
  template: `
    <app-legal-layout
      heading="Contact Us"
      path="/contact"
      lead="We'd love to hear from you."
      updated="July 2, 2026"
      description="Get in touch with the Zenamaze team for support, feedback, privacy requests or partnership enquiries.">

      <p>Have a question, a bug to report, or feedback that could make <strong>Zenamaze</strong> better? Reach us at:</p>

      <h2>Support</h2>
      <p>General help and bug reports: <a href="mailto:support&#64;zenamaze.knocdoc.in">support&#64;zenamaze.knocdoc.in</a></p>

      <h2>Privacy &amp; data requests</h2>
      <p>Privacy questions or data deletion: <a href="mailto:privacy&#64;zenamaze.knocdoc.in">privacy&#64;zenamaze.knocdoc.in</a> — see also our <a href="/data-deletion">Data Deletion Policy</a>.</p>

      <h2>Partnerships &amp; press</h2>
      <p>Business enquiries: <a href="mailto:hello&#64;zenamaze.knocdoc.in">hello&#64;zenamaze.knocdoc.in</a></p>

      <p>We aim to reply within two business days.</p>
    </app-legal-layout>
  `,
})
export class ContactComponent {}
