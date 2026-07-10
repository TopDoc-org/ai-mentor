import { Component } from '@angular/core';
import { LegalLayoutComponent } from './legal-layout.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [LegalLayoutComponent],
  template: `
    <app-legal-layout
      heading="About Zenamaze"
      path="/about"
      lead="Goals, shipped daily."
      updated="July 2, 2026"
      description="Zenamaze is an AI-powered goals and productivity app that turns one big ambition into a single daily action.">

      <p><strong>Zenamaze</strong> exists for people who are tired of big goals that never move. Instead of another to‑do list, Zenamaze asks the harder question — <em>why</em> this goal — then builds a system around it and hands you one clear action each day.</p>

      <h2>How it works</h2>
      <ul>
        <li><strong>Tell Zenamaze your goal.</strong> It interrogates what you really want and the real reason behind it.</li>
        <li><strong>Get a plan.</strong> Zenamaze turns the goal into a system with a single daily action.</li>
        <li><strong>Show up daily.</strong> Streaks, reminders and a focus timer keep momentum going — and make it sting to skip.</li>
        <li><strong>See progress.</strong> Watch the compounding effect of small daily wins.</li>
      </ul>

      <h2>Our philosophy</h2>
      <p>Ambition is common; systems are rare. Zenamaze is built on the belief that one honest goal plus one daily move beats a hundred half‑finished plans.</p>

      <p>Ready to start? <a href="/">Try Zenamaze free</a> — no signup required to preview your first plan.</p>
    </app-legal-layout>
  `,
})
export class AboutComponent {}
