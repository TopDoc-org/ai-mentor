# Analytics Plan — Zenamaze

_Audited 2026-07-03. Stack: Firebase Analytics (GA4) via `AnalyticsService` (`src/app/core/analytics.service.ts`), event catalog in `src/app/core/analytics-events.ts`._

## Readiness: 80 / 100
Infrastructure is production-grade: lazy Firebase, SSR/prerender-safe no-op, queue-and-flush, centralized snake_case event names. Deduction: real Firebase keys not yet added, and ~half the domain events are defined but not yet fired at their call sites (mechanical wiring — insertion points below).

## Architecture (already correct)
- **Lazy + safe:** Firebase dynamically imported → not in initial bundle, never runs during prerender. No-op until real `apiKey`+`measurementId` land in `environment*.ts` → app ships today, events flow later with **zero code change**.
- **Screen views:** auto-logged on every `NavigationEnd` (`app.component.ts`).
- **User identity:** `setUser()` on login, `setUser(null)` on logout.
- **No duplicate tracking**, consistent GA4 snake_case naming.

## Event catalog & wiring status

| Event | Name | Trigger | Params | Wired? | Where / insert at |
|-------|------|---------|--------|--------|-------------------|
| Sign Up | `sign_up` | account created | `method` | ✅ | `auth.service.ts:37` |
| Login | `login` | login success | `method` | ✅ | `auth.service.ts:47` |
| Logout | `logout` | logout | — | ✅ | `auth.service.ts:59` |
| Guest Convert | `guest_convert` | guest plan claimed | — | ✅ | `auth.service.ts:38,48` |
| Screen View | `screen_view` | route change | `screen_name` | ✅ | `app.component.ts:22` |
| Guest Goal Started | `guest_goal_started` | landing CTA | — | ✅ | `landing.component.ts:124` |
| Goal Created | `goal_created` | authed new goal saved | `category` | ⛔ | `new-goal.component.ts` on create success |
| Plan Confirmed | `plan_confirmed` | plan accepted | `goal_id` | ⛔ | `plan.component.ts` on confirm |
| Plan Revised | `plan_revised` | "I'm behind" → revise | `goal_id` | ⛔ | `plan.component.ts` revise handler |
| Goal Deleted | `goal_deleted` | goal deleted | — | ⛔ | profile/goal delete handler |
| Task Completed | `task_completed` | daily task done | `points` | ⛔ | `tasks.component.ts` / `dashboard.component.ts` completeTask |
| Task Postponed | `task_postponed` | postpone action | — | ⛔ | tasks postpone handler |
| Todo Completed | `todo_completed` | to-do checked | — | ⛔ | tasks/todo handler |
| Focus Started | `focus_started` | timer start | `minutes` | ⛔ | `focus-timer.component.ts` start |
| Focus Completed | `focus_completed` | timer finished | `minutes` | ⛔ | `focus-timer.component.ts` complete |
| Reminder Created | `reminder_created` | reminder saved | — | ⛔ | `reminders.component.ts` create |
| Reminder Snoozed | `reminder_snoozed` | snooze | — | ⛔ | reminder-host/reminders snooze |
| Note Created | `note_created` | note saved | — | ⛔ | `notes.component.ts` save |
| Progress Viewed | `progress_viewed` | open progress | — | ⛔ | `progress.component.ts` ngOnInit |
| Search | `search` | search performed | `term` | ⛔ | wire if/when search UI ships |
| Share | `share` | share action | `method` | ⛔ | share button handler |
| Notification Clicked | `notification_clicked` | notif tap | — | ⛔ | `native-notify.service.ts` tap listener |

**E-commerce / healthcare / appointment events from the generic brief are intentionally excluded** — Zenamaze has no payments, doctors, or appointments. Adding them would be dead code.

### How to wire (pattern)
```ts
private readonly analytics = inject(AnalyticsService);
// on the success path:
this.analytics.logEvent(AnalyticsEvent.TaskCompleted, { points });
```
`AnalyticsEvent` is already imported/typed; `logEvent` is a no-op until Firebase config is set, so wiring is safe to land now.

## To activate
1. Create a Firebase project → add a Web app → copy config into `environment.ts` **and** `environment.prod.ts` (`firebase` block).
2. For the Android build, add Firebase **Crashlytics** + **Performance** SDKs and `google-services.json` (build.gradle already conditionally applies `com.google.gms.google-services`).
3. **Google Search Console:** verify the domain, submit `sitemap.xml`.
4. **GTM:** optional — GA4 direct via Firebase is sufficient; add GTM only if marketing needs tag management without redeploys.

## Recommended dashboards (GA4)
- **Acquisition funnel:** `guest_goal_started` → `sign_up` / `guest_convert`.
- **Activation:** `goal_created` → `plan_confirmed` → first `task_completed`.
- **Retention/engagement:** DAU, `task_completed` per user/day, `focus_completed`, streak proxy.
- **Feature adoption:** reminders, notes, focus timer usage.
- **Crashlytics** stability + **Performance** app-start/screen-render (once SDKs added).
