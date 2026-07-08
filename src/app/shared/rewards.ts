// Reward/focus copy — shared by the dashboard and progress screens so the two
// never drift apart. Pure functions of the dashboard payload.
import { Dashboard } from '../core/models';

export function rewardBadge(d: Pick<Dashboard, 'streak' | 'focusDays'>): string | null {
  if (d.streak >= 30) return '👑 Unstoppable';
  if (d.streak >= 14) return '⚡ On fire';
  if (d.streak >= 7) return '🏅 Week Warrior';
  if (d.focusDays >= 5) return '🎯 Locked in';
  return null;
}

export function focusCaption(d: Pick<Dashboard, 'focusDays'>): string {
  if (d.focusDays >= 6) return `${d.focusDays}/7 days fully done this week — elite focus. Keep it going.`;
  if (d.focusDays >= 4) return `Focused ${d.focusDays}/7 days this week. Solid — push for a perfect week.`;
  if (d.focusDays >= 1) return `Only ${d.focusDays}/7 days this week. You've been slipping — reset today.`;
  return `0/7 days this week. This is where it slips away. Do one task now.`;
}
