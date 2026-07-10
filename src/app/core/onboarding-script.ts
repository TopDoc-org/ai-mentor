// Pip — the onboarding sidekick. Zenamaze does the tough love; Pip is the
// hype-gremlin that keeps a first-timer from rage-quitting. All the funny
// onboarding copy lives here so the tone is easy to tune in one place.
//
// A few lines flex with the user's chosen roast level (gentle→savage) so Pip's
// energy matches the Zenamaze they signed up for. Everything falls back to the
// 'balanced' voice when no level is set (e.g. still a guest).

export type RoastKey = 'gentle' | 'balanced' | 'brutal' | 'savage';

function roast(level: string | null | undefined): RoastKey {
  const l = (level || 'balanced').toLowerCase();
  return (['gentle', 'balanced', 'brutal', 'savage'].includes(l) ? l : 'balanced') as RoastKey;
}

// Pick a per-roast variant, falling back down the ladder if a level is missing.
function pick(map: Partial<Record<RoastKey, string>>, level: string | null | undefined): string {
  const order: RoastKey[] = [roast(level), 'brutal', 'balanced', 'gentle'];
  for (const k of order) if (map[k]) return map[k]!;
  return Object.values(map)[0] || '';
}

export const PIP = {
  name: 'Pip',

  // --- Beat 0: first-open welcome dialog (on the landing page) ---
  welcome: {
    title: 'Well, well. A fresh face. 👋',
    body:
      "I'm Pip — your pocket hype-gremlin. Zenamaze handles the tough love; I make sure you don't rage-quit in the first five minutes. Been here before?",
    warning:
      "⚠️ Fair warning: this app only works if you're honest — with your goals, at least.",
    newBtn: "I'm new — show me around",
    returningBtn: 'I have an account',
  },

  // Nudge shown right after "I'm new" — points them at the goal box so the
  // guided run has an obvious next move instead of dumping them on the landing.
  startHint: "Right here 👇 tell me what you want to achieve and hit Start — I'll take it from there.",

  // --- Beat 1: guest discovery chat (mascot narrates over the AI Zenamaze) ---
  // Chapter label shown in place of a bare "% clear".
  chapter(progress: number): string {
    if (progress >= 100) return 'Final chapter — lock it in';
    if (progress >= 66) return 'Chapter 3 · Almost there';
    if (progress >= 33) return 'Chapter 2 · Digging deeper';
    return 'Chapter 1 · The why';
  },
  // Pip's aside, keyed to how far the interview has gotten.
  discovery(progress: number): string {
    if (progress >= 100) return "Boom — that's a real plan. Skim it and change anything that feels off.";
    if (progress >= 66) return 'Almost got your number. Hang in there — this is the useful part.';
    if (progress >= 33) return "See? It's not just nodding along. It actually wants specifics.";
    return "Zenamaze's fishing for your real reason. Don't be shy — vague goals get vague plans.";
  },

  // --- Beat 2: plan reveal → sign-up gate (guest) ---
  planGate: {
    title: 'Your plan is ready.',
    body:
      'Create a free account to save it and keep your progress. I\'ll check in each day to help you stay on track. Takes about 30 seconds.',
  },

  // --- Beat 3: post-sign-up spotlight tour (real actions) ---
  tour: {
    // Step: first to-do
    todoIntro: {
      title: "You're in! 🎉",
      body:
        "Goal: handled. Now the fun bits. A TO-DO is a one-off thing you need done — link it to a goal later and it's worth more points. Let's make your first.",
      cta: 'Make my first to-do',
    },
    todoOnPage:
      "Tap ‘+ New’, type anything you keep forgetting, then hit ‘Add to-do’. I'll be right here.",
    todoDone: 'One down. That felt good — admit it.',

    // Step: first reminder
    reminderIntro: {
      title: 'Now, a reminder 🔔',
      body:
        'A to-do waits quietly. A REMINDER actually pokes you at a day + time — so your phone does the nagging instead of me. Set one for something future-you will thank you for.',
      cta: 'Set my first reminder',
    },
    reminderOnPage:
      "Give it a title and a time, then hit ‘Add reminder’. Future-you says thanks.",

    // Finale
    graduate: {
      title: (level?: string | null) =>
        pick(
          {
            gentle: "You did it! 🌱",
            balanced: "You're officially dangerous. 🚀",
            brutal: 'Look at you, functional and everything. 🚀',
            savage: 'Well damn. You actually finished. 🚀',
          },
          level,
        ),
      body:
        'Goal ✅  ·  To-do ✅  ·  Reminder ✅. You know the whole app now. Go show up today — I already handled the confetti.',
      badge: 'Onboarding Champ',
      cta: 'Take me to Today →',
    },
  },

  skip: 'Skip the tour',
};
