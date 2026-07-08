import { Component, OnInit, inject } from '@angular/core';
import { LegalLayoutComponent } from './legal-layout.component';
import { SeoService } from '../../core/seo.service';

interface Faq { q: string; a: string; }

const FAQS: Faq[] = [
  { q: 'Do I need an account to try Zenamaze?',
    a: 'No. You can enter a goal and preview a full plan as a guest. Create an account only when you want to save your plan and track progress.' },
  { q: 'How does Zenamaze build my plan?',
    a: 'Zenamaze asks about your goal and the real reason behind it, then turns it into a system with a single daily action to keep you moving.' },
  { q: 'How do reminders work?',
    a: 'Reminders you create are scheduled as on-device notifications, so they fire at the exact time even if the app is closed. Grant notification permission to enable them.' },
  { q: 'Is my data private?',
    a: 'Yes. We do not sell your data or use it for third-party ads. See our Privacy Policy for details.' },
  { q: 'How do I delete my account?',
    a: 'You can delete your account and all associated data from your Profile, or by emailing support@zenamaze.knocdoc.in. See our Data Deletion Policy.' },
];

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [LegalLayoutComponent],
  template: `
    <app-legal-layout
      heading="Help & Support"
      path="/help"
      lead="Answers to common questions — and how to reach us."
      updated="July 2, 2026"
      description="Zenamaze help centre: how the app works, reminders, privacy, account deletion, and how to contact support.">

      @for (f of faqs; track f.q) {
        <h2>{{ f.q }}</h2>
        <p>{{ f.a }}</p>
      }

      <h2>Still need help?</h2>
      <p>Email <a href="mailto:support&#64;zenamaze.knocdoc.in">support&#64;zenamaze.knocdoc.in</a> or visit our <a href="/contact">Contact</a> page. For data questions see the <a href="/privacy">Privacy Policy</a> and <a href="/data-deletion">Data Deletion Policy</a>.</p>
    </app-legal-layout>
  `,
})
export class HelpComponent implements OnInit {
  private readonly seo = inject(SeoService);
  readonly faqs = FAQS;

  ngOnInit(): void {
    // FAQPage structured data — eligible for rich results in search.
    this.seo.setJsonLd('ld-faq', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }
}
