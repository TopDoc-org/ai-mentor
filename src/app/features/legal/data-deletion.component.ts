import { Component } from '@angular/core';
import { LegalLayoutComponent } from './legal-layout.component';

@Component({
  selector: 'app-data-deletion',
  standalone: true,
  imports: [LegalLayoutComponent],
  template: `
    <app-legal-layout
      heading="Data Deletion Policy"
      path="/data-deletion"
      lead="How to delete your Zenamaze account and all associated data."
      updated="July 2, 2026"
      description="Instructions to permanently delete your Zenamaze account and all associated personal data, as required by Google Play.">

      <p>You can permanently delete your <strong>Zenamaze</strong> account and all data associated with it at any time. This page satisfies Google Play's account‑ and data‑deletion requirement.</p>

      <h2>What gets deleted</h2>
      <ul>
        <li>Your account (name, email, mobile number).</li>
        <li>All goals, plans, tasks, to‑dos, reminders, notes and progress history.</li>
        <li>Any scheduled device notifications tied to your reminders.</li>
      </ul>

      <h2>How to request deletion</h2>
      <ul>
        <li><strong>In the app</strong> — open <a href="/profile">Profile</a> → <strong>Delete account</strong>, confirm with your password, and type <strong>DELETE</strong>. Your account is deactivated immediately and scheduled for permanent deletion.</li>
        <li><strong>By email</strong> — if you cannot sign in, send a request from your registered email to <a href="mailto:support&#64;zenamaze.knocdoc.in">support&#64;zenamaze.knocdoc.in</a> with the subject "Delete my account". We verify ownership before deleting.</li>
      </ul>

      <h2>Grace period &amp; recovery</h2>
      <p>Deletion is not immediate. Your account is deactivated at once and held for a <strong>30-day grace period</strong>, during which you can cancel and restore everything by simply logging back in. If you do nothing, the account is permanently purged after 30 days.</p>

      <h2>Timeline</h2>
      <p>After the 30-day grace period, your account and all associated data are permanently and irreversibly deleted from our systems. Backups containing residual copies are purged on their normal rotation cycle. Some records may be retained only where required by law.</p>

      <h2>Deleting local data</h2>
      <p>Uninstalling the app removes locally cached data and cancels pending on‑device notifications. To also remove server‑side data, submit a deletion request as above.</p>
    </app-legal-layout>
  `,
})
export class DataDeletionComponent {}
