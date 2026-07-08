import { Component } from '@angular/core';
import { LegalLayoutComponent } from './legal-layout.component';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [LegalLayoutComponent],
  template: `
    <app-legal-layout
      heading="Privacy Policy"
      path="/privacy"
      lead="How Zenamaze collects, uses, and protects your information."
      updated="July 2, 2026"
      description="Read how Zenamaze collects, uses, stores and protects your personal data, and the choices and rights you have over it.">

      <p>This Privacy Policy explains how <strong>Zenamaze</strong> ("we", "us") handles your information when you use the Zenamaze app and website (the "Service"). We keep data collection to the minimum needed to run the Service.</p>

      <h2>Information we collect</h2>
      <ul>
        <li><strong>Account details</strong> — your name, email address and mobile number, provided when you create an account.</li>
        <li><strong>Your content</strong> — the goals, plans, tasks, to‑dos, reminders, notes and progress you create in the app.</li>
        <li><strong>Guest usage</strong> — if you try Zenamaze without an account, a temporary guest goal is created so you can preview a plan; it is only linked to you if you later create an account and claim it.</li>
        <li><strong>Technical data</strong> — basic device and usage information needed to operate and secure the Service. If analytics are enabled, aggregated event data (see our <a href="/cookies">Cookie Policy</a>).</li>
      </ul>

      <h2>How we use your information</h2>
      <ul>
        <li>To provide the core Service — generating plans, tracking tasks, and sending the reminders you schedule.</li>
        <li>To authenticate you and keep your account secure.</li>
        <li>To improve the product through aggregated, non‑identifying analytics.</li>
      </ul>

      <h2>Notifications</h2>
      <p>If you grant notification permission, Zenamaze schedules local device notifications for the reminders you create. You can revoke this permission at any time in your device settings; reminders will then only appear while the app is open.</p>

      <h2>Data storage and sharing</h2>
      <p>Your account and content are stored on our backend servers and processed to deliver the Service. We do <strong>not</strong> sell your personal data and we do <strong>not</strong> use it for third‑party advertising. Data may be processed by infrastructure and analytics providers acting on our behalf under appropriate safeguards.</p>

      <h2>Your rights</h2>
      <p>You can access, correct, export or delete your data. To delete your account and associated data, see our <a href="/data-deletion">Data Deletion Policy</a>.</p>

      <h2>Children</h2>
      <p>Zenamaze is not directed at children under 13, and we do not knowingly collect their data.</p>

      <h2>Contact</h2>
      <p>Questions about this policy? Email <a href="mailto:privacy&#64;zenamaze.knocdoc.in">privacy&#64;zenamaze.knocdoc.in</a> or visit our <a href="/contact">Contact</a> page.</p>
    </app-legal-layout>
  `,
})
export class PrivacyComponent {}
