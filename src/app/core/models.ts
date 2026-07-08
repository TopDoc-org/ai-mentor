export interface ZenamazeUser {
  userId: string;
  email: string;
  phone?: string;
  name: string;
  timezone: string;
  language?: string; // preferred Zenamaze roast/motivation language
  roastLevel?: string; // Zenamaze roast harshness: gentle|balanced|brutal|savage
}

// Zenamaze roast harshness ladder (mirrors ROAST_LEVELS on the backend).
export interface RoastLevel {
  id: string;
  label: string;
  emoji: string;
  desc: string;
}
export const ROAST_LEVELS: RoastLevel[] = [
  { id: 'gentle', label: 'Gentle', emoji: '😊', desc: 'Kind nudges, zero sting.' },
  { id: 'balanced', label: 'Balanced', emoji: '💪', desc: 'Honest coach, a little sting.' },
  { id: 'brutal', label: 'Brutal', emoji: '🔥', desc: 'Savage & sarcastic, mild swears.' },
  { id: 'savage', label: 'Savage', emoji: '💀', desc: '18+ no-mercy desi gaaliyan.' },
];

export interface AuthResponse {
  token: string;
  user: ZenamazeUser;
}

export interface Milestone {
  title: string;
  targetDate: string;
}
export interface RecurringTask {
  id?: string;
  title: string;
  cadence: string;
  estMinutes: number;
  // Weekday schedule: 0-6 (Sun..Sat). null / empty / all 7 => every day.
  daysOfWeek?: number[] | null;
  // YYYY-MM-DD; while today <= pausedUntil the task isn't shown ("stall").
  pausedUntil?: string | null;
  // Sequential phase (1 = active now; 2+ = starts after the previous phase's
  // milestone). `activatesOn` is the resolved gate date for phase > 1.
  phase?: number;
  activatesOn?: string | null;
}

// Patch for editing a recurring "focus" task's schedule.
export interface FocusPatch {
  daysOfWeek?: number[] | null;
  pausedUntil?: string | null;
  estMinutes?: number;
  title?: string;
}
export interface OneOffTask {
  title: string;
  dueDate: string;
}
export interface Checkpoint {
  date: string;
  target: string;
}
export interface GoalSummaryPreview {
  understanding: string;
  dailyCommitment: string | null;
  breakdown: string[];
  deadlineDate: string | null;
  category: string;
}

export interface Plan {
  goalRestated: string;
  coreMotivation: string | null;
  category?: string;
  deadlineDate: string | null;
  milestones: Milestone[];
  checkpoints: Checkpoint[];
  recurringTasks: RecurringTask[];
  oneOffTasks: OneOffTask[];
  deadline: string | null;
  generatedAt: string;
  revisedAt?: string; // set when the plan was produced by a revision
}

// --- Plan-revision diff (per-item retain vs change) -------------------------
export type RevisionDiffState = 'added' | 'removed' | 'changed' | 'unchanged';

// One focus (recurring) task in the proposed-vs-current diff.
export interface FocusDiffRow {
  key: string;
  state: RevisionDiffState;
  old?: RecurringTask;
  proposed?: RecurringTask;
}

// One one-off / to-do row in the diff. `todo` is the matching real to-do (if the
// user had added this plan item to their to-do list), so a dropped item can be
// cascade-deleted from the actual list.
export interface TodoDiffRow {
  key: string;
  state: RevisionDiffState;
  old?: OneOffTask;
  proposed?: OneOffTask;
  todo?: Todo;
}

export interface RevisionDiff {
  focus: FocusDiffRow[];
  todos: TodoDiffRow[];
}

export interface ChatMessage {
  role: 'assistant' | 'user';
  text: string;
  ts?: string;
}

// Response from POST /message — a next question, a confirmation summary, or the
// finished plan.
export interface TurnResponse {
  type: 'question' | 'summary' | 'plan';
  message?: string;
  askedCount?: number;
  progress?: number;
  stepsLeft?: number;
  summary?: GoalSummaryPreview;
  plan?: Plan;
}

export interface Task {
  taskId: string;
  userId: string;
  goalId: string;
  title: string;
  type: 'recurring' | 'milestone' | 'oneoff';
  date: string;
  status: 'pending' | 'done' | 'missed' | 'postponed';
  estMinutes: number | null;
  spentMs?: number; // focus time accumulated across ended-early sessions
  completedAt: string | null;
}

// Response from completing or postponing a task — carries a Zenamaze message.
export interface TaskActionResponse {
  task: Task;
  momentum: number;
  streak: number;
  message: string;
  points?: number;
  level?: number;
  pointsToNext?: number;
}

// --- To-dos (free-standing user tasks) --------------------------------------
export type TodoSchedule = 'date' | 'deadline' | 'span' | 'none';
export type TodoPriority = 'low' | 'normal' | 'high';
export type TodoStatus = 'open' | 'done';
export type TodoBucket = 'overdue' | 'today' | 'upcoming' | 'someday';

export interface Todo {
  todoId: string;
  userId: string;
  goalId: string | null;
  title: string;
  notes: string | null;
  schedule: TodoSchedule;
  dueDate: string | null;
  startDate: string | null;
  endDate: string | null;
  priority: TodoPriority;
  status: TodoStatus;
  pointsValue: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  // Computed server-side on read:
  bucket: TodoBucket;
  urgency: number;
  overdue: boolean;
}

// Payload for creating/updating a to-do.
export interface TodoInput {
  title?: string;
  notes?: string | null;
  goalId?: string | null;
  schedule?: TodoSchedule;
  dueDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  priority?: TodoPriority;
}

// Response from completing a to-do — carries earned points + refreshed totals.
export interface TodoActionResponse {
  todo: Todo;
  earned?: number;
  points: number;
  level: number;
  pointsToNext: number;
  todosDone?: number;
}

// --- Reminders (in-app nudges) ----------------------------------------------
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
export type ReminderPriority = 'low' | 'normal' | 'high';
export type ReminderStatus = 'active' | 'done';

export interface Reminder {
  reminderId: string;
  userId: string;
  goalId: string | null;
  title: string;
  notes: string | null;
  fireDate: string; // YYYY-MM-DD (next occurrence)
  fireTime: string | null; // HH:mm 24h, optional
  recurrence: Recurrence;
  intervalDays?: number | null; // for recurrence === 'custom': repeat every N days
  priority: ReminderPriority;
  status: ReminderStatus;
  snoozedUntil: string | null;
  lastFiredAt: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Computed server-side on read:
  dueNow: boolean;
  overdue: boolean;
  doneToday: boolean;
  nextFireAt: string; // ISO of the effective (snooze-aware) fire moment
  whenLabel: string; // e.g. "Today 9:00 AM"
}

// --- Analysis screen (completion history) -----------------------------------
export type DayStatus = 'done' | 'partial' | 'missed' | 'today';

export interface AnalysisDay {
  date: string; // YYYY-MM-DD
  done: number;
  total: number;
  status: DayStatus;
}

export interface AnalysisWeekday {
  day: number; // 0 = Sunday .. 6 = Saturday
  rate: number; // 0-100 completion rate on that weekday
  total: number; // tasks seen on that weekday (0 = no data)
}

export interface AnalysisSummary {
  activeDays: number;
  perfectDays: number;
  partialDays: number;
  zeroDays: number;
  totalTasks: number;
  totalDone: number;
  completionRate: number; // 0-100
  currentStreak: number;
  bestStreak: number;
  momentum: number; // 0-100
}

export interface AnalysisMeme {
  template?: string; // human/desi name of the meme template
  id?: string; // memegen.link template id for the rendered image
  top: string;
  bottom: string;
  emoji: string;
}

export interface Analysis {
  today: string; // YYYY-MM-DD
  days: AnalysisDay[];
  weekday: AnalysisWeekday[];
  summary: AnalysisSummary;
  roast: string;
  meme: AnalysisMeme;
}

export interface AnalysisTaskRow {
  title: string;
  type: string;
  estMinutes: number;
  goalId: string | null;
  reason?: 'missed' | 'postponed'; // present on procrastinated rows
}

export interface AnalysisDayDetail {
  date: string;
  total: number;
  doneCount: number;
  ratioTotal: number;
  done: AnalysisTaskRow[];
  procrastinated: AnalysisTaskRow[];
  pending: AnalysisTaskRow[];
}

export interface ReminderInput {
  title?: string;
  notes?: string | null;
  goalId?: string | null;
  fireDate?: string;
  fireTime?: string | null;
  recurrence?: Recurrence;
  intervalDays?: number | null;
  priority?: ReminderPriority;
}

// --- Notes (sticky notes) ---------------------------------------------------
export type NoteColor = 'yellow' | 'blue' | 'green' | 'pink';
// Typeface a note renders in — 'hand'/'marker' make it read handwritten.
export type NoteFont = 'sans' | 'serif' | 'hand' | 'marker';

export interface Note {
  noteId: string;
  userId: string;
  goalId: string | null;
  title: string | null;
  body: string;
  color: NoteColor;
  font?: NoteFont;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

// Payload for creating/updating a note (all fields optional).
export interface NoteInput {
  title?: string | null;
  body?: string;
  color?: NoteColor;
  font?: NoteFont;
  pinned?: boolean;
  goalId?: string | null;
}

export interface WeekDay {
  date: string;
  status: 'done' | 'partial' | 'missed' | 'today' | 'none';
  done: number;
  total: number;
}

export interface GoalSummary {
  goalId: string;
  title: string;
  phase: 'discovery' | 'summary' | 'planning' | 'done';
  category: string | null;
  createdAt: string;
  updatedAt: string;
  momentumScore: number;
  streak: number;
  deadline: string | null;
  hasPlan: boolean;
  surplusMinutes?: number; // banked overtime, offsets postpones
  revisionCount?: number; // count of applied plan revisions (planning-not-doing signal)
}

export interface Goal extends GoalSummary {
  messages: ChatMessage[];
  discoveryState: { collected: Record<string, unknown>; askedCount: number; askedQuestions: string[] };
  plan: Plan | null;
  coreMotivation: string | null;
  // Pre-plan confirmation summary — present once the interview reaches the
  // `summary` phase; lets the confirmation card survive a reload.
  summary?: GoalSummaryPreview | null;
  // A previewed-but-not-yet-applied plan revision (survives reload).
  pendingRevision?: { plan: Plan; feedback: string; createdAt: string } | null;
}

export type MedalTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface ScoreBand {
  code: string;
  label: string;
  emoji: string;
  tier: MedalTier;
}

export interface Medal {
  code: string;
  label: string;
  emoji: string;
  tier: MedalTier;
  description: string;
  shareTagline: string;
  unlockedAt: string | null;
}

// The six [0,1] score components, surfaced so the UI can show a breakdown.
export interface ScoreComponents {
  accomplishment: number;
  momentum: number;
  streak: number;
  pace: number;
  focus: number;
  volume: number;
}

export interface ProductivityScore {
  score: number; // 300-900 (CIBIL-style)
  percent: number; // 0-100 overall
  raw: number;
  band: ScoreBand;
  components: ScoreComponents;
  momentum: number;
  streak: number;
  dailyPercent: number | null; // today's effort-weighted completion %
  medals: Medal[];
  newlyUnlockedMedals: Medal[];
}

export interface ShareLinks {
  shareId: string;
  shareUrl: string;
  cardUrl: string;
}

// --- Connections (LinkedIn-style social graph) ------------------------------
export type ConnectionStatus = 'pending' | 'accepted' | 'declined';

// The OTHER person on a connection edge — public fields only.
export interface ConnectionUser {
  userId: string;
  name: string;
  email: string;
}

export interface ConnectionRow {
  connectionId: string;
  status: ConnectionStatus;
  createdAt: string;
  user: ConnectionUser | null;
}

export interface ConnectionsView {
  accepted: ConnectionRow[];
  incoming: ConnectionRow[];
  outgoing: ConnectionRow[];
}

// --- Team projects -----------------------------------------------------------
export type ProjectRole = 'owner' | 'admin' | 'member';
export type ProjectMemberStatus = 'invited' | 'active' | 'left';

export interface ProjectSummary {
  projectId: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  myRole: ProjectRole;
  memberCount: number;
}

export interface ProjectMember {
  userId: string;
  role: ProjectRole;
  status: ProjectMemberStatus;
  joinedAt: string | null;
  user: ConnectionUser | null;
}

export interface ProjectDetail {
  projectId: string;
  name: string;
  description: string | null;
  ownerId: string;
  goalCreation: 'owner' | 'members';
  createdAt: string;
  updatedAt: string;
  myRole: ProjectRole;
  members: ProjectMember[];
}

// A pending invite this user has received, shown in a "you've been invited" inbox.
export interface ProjectInvite {
  project: ProjectSummary;
  invitedBy: string | null;
}

// --- Shared group goals + assignable tasks -----------------------------------
export type ProjectGoalStatus = 'active' | 'done' | 'archived';
export type ProjectTaskStatus = 'open' | 'done';

export interface ProjectGoal {
  projectGoalId: string;
  projectId: string;
  title: string;
  description: string | null;
  category: string | null;
  targetDate: string | null;
  createdBy: string;
  status: ProjectGoalStatus;
  linkedGoalId: string | null;
  createdAt: string;
  updatedAt: string;
  // Present on goals built through the AI discovery flow:
  aiGoal?: boolean;
  phase?: 'discovery' | 'summary' | 'planning' | 'done';
  messages?: ChatMessage[];
  discoveryState?: { collected: Record<string, unknown>; askedCount: number; askedQuestions: string[] };
  summary?: GoalSummaryPreview | null;
  plan?: Plan | null;
  deadlineDate?: string | null;
  coreMotivation?: string | null;
}

export interface ProjectGoalInput {
  title?: string;
  description?: string | null;
  category?: string | null;
  targetDate?: string | null;
  status?: ProjectGoalStatus;
}

export interface ProjectTask {
  projectTaskId: string;
  projectId: string;
  projectGoalId: string;
  title: string;
  assigneeId: string | null;
  weight: number;
  status: ProjectTaskStatus;
  dueDate: string | null;
  completedAt: string | null;
  // Sequential-phase gate (recurring tasks only): while `gated` and today is
  // before `activatesOn`, the task is locked — hidden from the active board and
  // excluded from progress until its phase unlocks (by date or an admin).
  activatesOn?: string | null;
  gated?: boolean;
  // Daily-process feature: state of the per-assignee "one keystone daily action"
  // setup chat and the daily reminder it produced.
  processStatus?: ProjectTaskProcessStatus;
  processAction?: string | null;   // the keystone daily action
  processMinutes?: number | null;  // est. minutes/day
  processFireTime?: string | null; // "HH:mm" daily time block
  processReminderId?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectTaskProcessStatus = 'none' | 'pending_setup' | 'active' | 'skipped';

// One turn of the task daily-process mini-interview (POST /project/task/:id/process/*).
export interface TaskProcessTurn {
  projectTaskId: string;
  processStatus: ProjectTaskProcessStatus;
  messages: ChatMessage[];
  type?: 'question' | 'proposal' | 'active';
  message?: string;
  action?: string | null;
  minutes?: number | null;
  fireTime?: string | null;
}

export interface ProjectTaskInput {
  title?: string;
  assigneeId?: string | null;
  weight?: number;
  dueDate?: string | null;
}

// --- Shared project to-dos (a team checklist; no points) ---------------------
export interface ProjectTodo {
  projectTodoId: string;
  projectId: string;
  assigneeId: string | null;
  createdBy: string;
  title: string;
  notes: string | null;
  schedule: TodoSchedule;
  dueDate: string | null;
  startDate: string | null;
  endDate: string | null;
  priority: TodoPriority;
  status: TodoStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  // computed on read:
  bucket: TodoBucket;
  urgency: number;
  overdue: boolean;
}

export interface ProjectTodoInput {
  title?: string;
  notes?: string | null;
  assigneeId?: string | null;
  schedule?: TodoSchedule;
  dueDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  priority?: TodoPriority;
}

// --- Shared project reminders (fire for all members) -------------------------
export interface ProjectReminder {
  projectReminderId: string;
  projectId: string;
  assigneeId: string | null;
  createdBy: string;
  title: string;
  notes: string | null;
  fireDate: string;
  fireTime: string | null;
  recurrence: Recurrence;
  intervalDays?: number | null;
  priority: ReminderPriority;
  status: ReminderStatus;
  snoozedUntil: string | null;
  lastFiredAt: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // computed on read:
  dueNow: boolean;
  overdue: boolean;
  doneToday: boolean;
  nextFireAt: string;
  whenLabel: string;
  projectName?: string; // present on the cross-project "active" feed
}

export interface ProjectReminderInput {
  title?: string;
  notes?: string | null;
  assigneeId?: string | null;
  fireDate?: string;
  fireTime?: string | null;
  recurrence?: Recurrence;
  intervalDays?: number | null;
  priority?: ReminderPriority;
}

// --- Team checkpoints + progress reports + AI plan-adjustment ---------------
export interface ProjectCheckpoint {
  projectCheckpointId: string;
  projectId: string;
  projectGoalId: string;
  date: string;
  target: string;
  createdAt: string;
  reportsCount?: number; // present on listProjectCheckpoints
}

export type ReportKind = 'checkpoint' | 'blocker';
export type ReportStatus = 'on_track' | 'challenge' | 'blocked';
export type AiState = 'none' | 'generating' | 'ready' | 'failed';
export type SuggestionStatus = 'pending' | 'applied' | 'dismissed';
export type ActionType = 'extend_due' | 'split_task' | 'reduce_scope' | 'reassign' | 'revise_plan';
export type ActionScope = 'self' | 'team';
export type ActionStatus = 'pending' | 'applied' | 'dismissed' | 'pending_approval' | 'approved' | 'rejected';

export interface SuggestionAction {
  actionId: string;
  type: ActionType;
  taskId: string | null;
  rationale: string;
  scope: ActionScope;
  requiresApproval: boolean;
  status: ActionStatus;
  newDueDate?: string;
  splitInto?: { title: string; weight: number }[];
  newWeight?: number;
  newTitle?: string;
  reassignToUserId?: string;
}

export interface AiSuggestion {
  summary: string;
  actions: SuggestionAction[];
}

// A checkpoint report (kind='checkpoint') or an anytime task-blocker flag
// (kind='blocker') — both drive the same async AI-suggestion engine.
export interface ProjectReport {
  reportId: string;
  kind: ReportKind;
  projectCheckpointId: string | null;
  projectTaskId: string | null;
  projectId: string;
  projectGoalId: string;
  userId: string;
  status: ReportStatus;
  note: string | null;
  submittedAt: string;
  aiState: AiState;
  aiSuggestion: AiSuggestion | null;
  suggestionStatus: SuggestionStatus | null;
  resolvedAt: string | null;
}

// A reassign/reduce_scope action awaiting owner/admin sign-off.
export interface ActionApproval {
  approvalId: string;
  projectId: string;
  projectGoalId: string;
  reportId: string;
  actionId: string;
  actionType: ActionType;
  taskId: string | null;
  fromUserId: string;
  toUserId: string | null;
  title: string;
  weight: number;
  dueDate: string | null;
  newWeight: number | null;
  newTitle: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: string;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  projectName?: string; // present on the cross-project pending feed
  fromUser?: ConnectionUser | null;
  toUser?: ConnectionUser | null;
  feedback?: string | null; // present only on actionType='revise_plan' — the text the revision runs with
}

export type NoticeKind = 'reassigned_to_you' | 'reassign_resolved' | 'approval_pending' | 'plan_revised';

export interface ProjectNotice {
  noticeId: string;
  projectId: string;
  userId: string;
  kind: NoticeKind;
  message: string;
  seen: boolean;
  createdAt: string;
}

// Cross-project Today-feed rows (mirror ProjectReminder's projectName pattern).
export interface MyProjectTask extends ProjectTask {
  projectName: string;
  overdue: boolean;
}

export interface MyProjectTodo extends ProjectTodo {
  projectName: string;
}

export interface PendingCheckpointReport {
  projectCheckpointId: string;
  projectId: string;
  projectGoalId: string;
  date: string;
  target: string;
  projectName: string;
  goalTitle: string;
}

// One consolidated fetch behind the Today page's team-item feed.
export interface TeamToday {
  tasks: MyProjectTask[];
  todos: MyProjectTodo[];
  reminders: ProjectReminder[];
  checkpointsPendingReport: PendingCheckpointReport[];
  pendingApprovalsCount: number;
  notices: ProjectNotice[];
}

// --- Team goal plan revision (task-level diff vs the solo focus/todo one) --
export interface ProjectPlanDiffItem {
  title: string;
  kind: 'milestone' | 'oneoff' | 'recurring';
  state: RevisionDiffState;
  dueDate?: string | null;
}

export interface ProjectPlanRevisionPreview {
  plan: Plan;
  diff: ProjectPlanDiffItem[];
  // Zenamaze's conversational reply to the user's message (answer / acknowledge /
  // ask for clarity). Null when the model returned none.
  reply?: string | null;
}

export interface ProjectPlanRevisionReconcile {
  created: number;
  updated: number;
  deleted: number;
  carried: number;
}

export interface ProjectPlanRevisionApplyResult {
  plan: Plan;
  reconcile: ProjectPlanRevisionReconcile;
}

// --- Cumulative progress + leaderboard (computed on read) --------------------
export interface ProjectGoalProgress {
  projectGoalId: string;
  title: string;
  status: ProjectGoalStatus;
  totalWeight: number;
  doneWeight: number;
  percent: number | null;
  taskCount: number;
  atRiskTaskIds: string[]; // tasks with an unresolved challenge/blocker report
  atRiskCount: number;
}

export interface ProjectLeaderboardRow {
  userId: string;
  user: ConnectionUser | null;
  role: ProjectRole;
  tasksDone: number;
  doneWeight: number;
  contributionShare: number; // 0-100, share of the project's total done-weight
  onTimePct: number | null; // null when they have no due-dated done tasks
  atRisk: boolean; // has an unresolved challenge/blocker report right now
}

export interface ProjectProgress {
  projectId: string;
  percent: number | null;
  totalWeight: number;
  doneWeight: number;
  goals: ProjectGoalProgress[];
  leaderboard: ProjectLeaderboardRow[];
}

export interface Dashboard {
  date: string;
  userName: string | null;
  greeting: string;
  momentum: number;
  streak: number;
  behindPace: number;
  deadlineDate: string | null;
  daysLeft: number | null;
  currentCheckpoint: Checkpoint | null;
  primaryGoalId: string | null;
  surplusMinutes?: number; // banked overtime for the primary goal
  points: number;
  level: number;
  pointsToNext: number;
  score: number; // productivity score 300-900
  scorePercent: number;
  scoreBand: ScoreBand;
  dailyPercent: number | null;
  newlyUnlockedMedals: Medal[];
  week: WeekDay[];
  focusDays: number;
  today: { tasks: Task[]; done: number; total: number };
  goals: GoalSummary[];
}
