import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthed()) return true;
  router.navigate(['/login']);
  return false;
};

// Public-only routes (landing, login): send already-authed users to the dashboard.
export const guestOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthed()) return true;
  router.navigate(['/dashboard']);
  return false;
};
