import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

// Lightweight app-wide signal that reminders changed (created / edited / deleted
// / acknowledged / snoozed). The global ReminderHostComponent listens and
// re-syncs its local timers immediately, so a reminder created while the app is
// open still fires at its exact moment — without polling or a reload.
@Injectable({ providedIn: 'root' })
export class ReminderBus {
  private readonly _changed = new Subject<void>();
  readonly changed$: Observable<void> = this._changed.asObservable();

  notifyChanged(): void {
    this._changed.next();
  }
}
