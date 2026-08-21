// Canonical analytics event names + param shapes for Zenamaze. Centralised so event
// naming stays consistent across the app (see ANALYTICS_PLAN.md). Names follow
// GA4 / Firebase snake_case convention. Medical/appointment/e-commerce events are
// intentionally absent — Zenamaze is a goals/productivity app with no such surface.
export const AnalyticsEvent = {
  // Authentication
  SignUp: 'sign_up',
  Login: 'login',
  Logout: 'logout',
  GuestConvert: 'guest_convert', // guest plan claimed into a new/existing account

  // Engagement
  ScreenView: 'screen_view',
  Search: 'search',
  Share: 'share',
  NotificationClicked: 'notification_clicked',

  // Goals / planning
  GuestGoalStarted: 'guest_goal_started',
  GoalCreated: 'goal_created',
  PlanConfirmed: 'plan_confirmed',
  PlanRevised: 'plan_revised',
  GoalDeleted: 'goal_deleted',

  // Daily execution
  TaskCompleted: 'task_completed',
  TaskPostponed: 'task_postponed',
  TodoCompleted: 'todo_completed',
  FocusStarted: 'focus_started',
  FocusCompleted: 'focus_completed',

  // Reminders / notes / progress
  ReminderCreated: 'reminder_created',
  ReminderSnoozed: 'reminder_snoozed',
  NoteCreated: 'note_created',
  ProgressViewed: 'progress_viewed',

  // Guided first-run onboarding (Pip)
  OnboardingStart: 'onboarding_start',
  OnboardingStep: 'onboarding_step', // per-beat funnel; param: { step }
  OnboardingComplete: 'onboarding_complete',
  OnboardingSkip: 'onboarding_skip', // param: { step } — where they bailed

  // Outbound funnel (/guide → DoctoGuide)
  GuideCtaClick: 'guide_cta_click', // params: { source, typed }
  GuideWhatsappClick: 'guide_whatsapp_click', // param: { source }
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];
