import { Routes } from '@angular/router';
import { authGuard, guestOnlyGuard } from './core/auth.guard';
import { unsavedChangesGuard } from './core/unsaved-changes.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'Zenamaze — Turn one big goal into one move today',
    canActivate: [guestOnlyGuard],
    loadComponent: () => import('./features/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'login',
    title: 'Log in or sign up · Zenamaze',
    canActivate: [guestOnlyGuard],
    loadComponent: () => import('./features/auth/auth.component').then((m) => m.AuthComponent),
  },
  // Guest (no account) discovery + plan preview
  {
    path: 'try/:id',
    title: 'Your Zenamaze plan preview',
    data: { guest: true },
    loadComponent: () =>
      import('./features/onboarding/onboarding.component').then((m) => m.OnboardingComponent),
  },
  {
    path: 'try/:id/plan',
    title: 'Your plan preview · Zenamaze',
    data: { guest: true },
    loadComponent: () => import('./features/plan/plan.component').then((m) => m.PlanComponent),
  },
  // Legal / policy pages — public, prerendered (see app.routes.server.ts)
  {
    path: 'privacy',
    title: 'Privacy Policy · Zenamaze',
    loadComponent: () => import('./features/legal/privacy.component').then((m) => m.PrivacyComponent),
  },
  {
    path: 'terms',
    title: 'Terms & Conditions · Zenamaze',
    loadComponent: () => import('./features/legal/terms.component').then((m) => m.TermsComponent),
  },
  {
    path: 'data-deletion',
    title: 'Data Deletion Policy · Zenamaze',
    loadComponent: () => import('./features/legal/data-deletion.component').then((m) => m.DataDeletionComponent),
  },
  {
    path: 'contact',
    title: 'Contact Us · Zenamaze',
    loadComponent: () => import('./features/legal/contact.component').then((m) => m.ContactComponent),
  },
  {
    path: 'about',
    title: 'About Zenamaze',
    loadComponent: () => import('./features/legal/about.component').then((m) => m.AboutComponent),
  },
  {
    path: 'help',
    title: 'Help & Support · Zenamaze',
    loadComponent: () => import('./features/legal/help.component').then((m) => m.HelpComponent),
  },
  {
    path: 'disclaimer',
    title: 'Disclaimer · Zenamaze',
    loadComponent: () => import('./features/legal/disclaimer.component').then((m) => m.DisclaimerComponent),
  },
  {
    path: 'cookies',
    title: 'Cookie Policy · Zenamaze',
    loadComponent: () => import('./features/legal/cookies.component').then((m) => m.CookiesComponent),
  },
  // Authenticated
  {
    path: 'onboarding/:id',
    title: 'Onboarding · Zenamaze',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/onboarding/onboarding.component').then((m) => m.OnboardingComponent),
  },
  {
    path: 'plan/:id',
    title: 'Your plan · Zenamaze',
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./features/plan/plan.component').then((m) => m.PlanComponent),
  },
  {
    path: 'dashboard',
    title: 'Dashboard · Zenamaze',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'tasks',
    title: 'Tasks · Zenamaze',
    canActivate: [authGuard],
    loadComponent: () => import('./features/tasks/tasks.component').then((m) => m.TasksComponent),
  },
  {
    path: 'reminders',
    title: 'Reminders · Zenamaze',
    canActivate: [authGuard],
    loadComponent: () => import('./features/reminders/reminders.component').then((m) => m.RemindersComponent),
  },
  {
    path: 'notes',
    title: 'Notes · Zenamaze',
    canActivate: [authGuard],
    loadComponent: () => import('./features/notes/notes.component').then((m) => m.NotesComponent),
  },
  {
    path: 'progress',
    title: 'Progress · Zenamaze',
    canActivate: [authGuard],
    loadComponent: () => import('./features/progress/progress.component').then((m) => m.ProgressComponent),
  },
  {
    path: 'score',
    title: 'Productivity Score · Zenamaze',
    canActivate: [authGuard],
    loadComponent: () => import('./features/score/score.component').then((m) => m.ScoreComponent),
  },
  {
    path: 'new',
    title: 'New goal · Zenamaze',
    canActivate: [authGuard],
    loadComponent: () => import('./features/new-goal/new-goal.component').then((m) => m.NewGoalComponent),
  },
  {
    path: 'profile',
    title: 'Profile · Zenamaze',
    canActivate: [authGuard],
    loadComponent: () => import('./features/profile/profile.component').then((m) => m.ProfileComponent),
  },
  {
    path: 'network',
    title: 'My Network · Zenamaze',
    canActivate: [authGuard],
    loadComponent: () => import('./features/network/network.component').then((m) => m.NetworkComponent),
  },
  {
    path: 'projects',
    title: 'Team Projects · Zenamaze',
    canActivate: [authGuard],
    loadComponent: () => import('./features/projects/projects.component').then((m) => m.ProjectsComponent),
  },
  {
    path: 'project/:id',
    title: 'Project · Zenamaze',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/project-detail/project-detail.component').then((m) => m.ProjectDetailComponent),
  },
  {
    path: 'project/:id/ai-goal/:goalId',
    title: 'Team goal · Zenamaze',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/project-ai-goal/project-ai-goal.component').then((m) => m.ProjectAiGoalComponent),
  },
  {
    path: 'goal/:id',
    title: 'Your goal · Zenamaze',
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./features/plan/plan.component').then((m) => m.PlanComponent),
  },
  { path: '**', redirectTo: '' },
];
