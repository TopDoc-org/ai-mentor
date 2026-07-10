import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications, ScheduleEvery } from '@capacitor/local-notifications';
import { Reminder } from './models';

// Bridges reminders to Android OS-level notifications (Capacitor Local
// Notifications, backed by AlarmManager). Unlike the in-app dialog, these fire
// even when the app is in the background OR fully killed. Repeating reminders use
// the OS's own repeat, so they keep nudging even if the app is never reopened.
//
// Web / non-native: every method is a no-op — the in-app ReminderHostComponent
// dialog + timers handle it there.
@Injectable({ providedIn: 'root' })
export class NativeNotifyService {
  readonly isNative = Capacitor.isNativePlatform();
  private permsAsked = false;
  private tapWired = false;

  constructor(private router: Router) {
    if (this.isNative) this.wireTap();
  }

  // Tapping a notification opens the reminders page.
  private async wireTap(): Promise<void> {
    if (this.tapWired) return;
    this.tapWired = true;
    try {
      await LocalNotifications.addListener('localNotificationActionPerformed', () => {
        this.router.navigate(['/reminders']);
      });
    } catch { /* listener best-effort */ }
  }

  private async ensurePermission(): Promise<boolean> {
    try {
      let perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted' && !this.permsAsked) {
        this.permsAsked = true;
        perm = await LocalNotifications.requestPermissions();
      }
      return perm.display === 'granted';
    } catch {
      return false;
    }
  }

  // Stable positive 32-bit int id derived from the reminderId, so we can
  // cancel/replace a reminder's notification deterministically.
  private idFor(reminderId: string): number {
    let h = 0;
    for (let i = 0; i < reminderId.length; i++) h = (h * 31 + reminderId.charCodeAt(i)) | 0;
    return (Math.abs(h) % 2147483000) + 1;
  }

  // Next fire instant as a Date. For repeating reminders, roll the server's
  // (snooze-aware) nextFireAt forward until it's in the future, so the OS's first
  // fire + repeat cadence line up. Returns null for a one-off already in the past
  // (that's handled in-app; nothing to schedule natively).
  private baseDate(r: Reminder): Date | null {
    let d = new Date(r.nextFireAt);
    const now = Date.now();
    if (r.recurrence === 'none') return d.getTime() > now ? d : null;
    if (r.recurrence === 'monthly') {
      while (d.getTime() <= now) { const n = new Date(d); n.setMonth(n.getMonth() + 1); d = n; }
      return d;
    }
    const stepMs = r.recurrence === 'weekly' ? 7 * 86400000 : 86400000;
    while (d.getTime() <= now) d = new Date(d.getTime() + stepMs);
    return d;
  }

  private everyFor(r: Reminder): ScheduleEvery | undefined {
    switch (r.recurrence) {
      case 'daily': return 'day';
      case 'weekly': return 'week';
      case 'monthly': return 'month';
      default: return undefined;
    }
  }

  // Reconcile OS notifications with the current active reminders: cancel all
  // app-scheduled ones, then (re)schedule from the given list. Called whenever
  // reminders change (created/edited/snoozed/acked/deleted).
  async sync(reminders: Reminder[]): Promise<void> {
    if (!this.isNative) return;
    if (!(await this.ensurePermission())) return;
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length) {
        await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
      }

      const notifications = [];
      for (const r of reminders) {
        if (r.status !== 'active') continue;
        const at = this.baseDate(r);
        if (!at) continue;
        const every = this.everyFor(r);
        notifications.push({
          id: this.idFor(r.reminderId),
          title: r.title,
          body: r.notes || (r.priority === 'high' ? 'Urgent reminder' : 'Reminder'),
          schedule: { at, allowWhileIdle: true, ...(every ? { every, repeats: true } : {}) },
          extra: { reminderId: r.reminderId },
        });
      }
      if (notifications.length) await LocalNotifications.schedule({ notifications });
    } catch { /* best-effort; the in-app dialog still covers foreground */ }
  }
}
