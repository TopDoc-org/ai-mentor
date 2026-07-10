import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

// Components that want to intercept navigation (e.g. to warn about unsaved
// edits) implement this. Return true to allow leaving, false to stay, or a
// Promise/Observable that resolves to the decision (lets the component pop its
// own confirm dialog first).
export interface CanComponentDeactivate {
  canDeactivate: () => boolean | Promise<boolean> | Observable<boolean>;
}

export const unsavedChangesGuard: CanDeactivateFn<CanComponentDeactivate> = (component) =>
  component && typeof component.canDeactivate === 'function' ? component.canDeactivate() : true;
