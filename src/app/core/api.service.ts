import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from './api-config';
import { Analysis, AnalysisDayDetail, ActionApproval, ChatMessage, ConnectionRow, ConnectionsView, ConnectionUser, Dashboard, FocusPatch, Goal, GoalSummary, Medal, ZenamazeUser, MyProjectTask, MyProjectTodo, Note, NoteInput, PendingCheckpointReport, Plan, ProductivityScore, ProjectCheckpoint, ProjectDetail, ProjectGoal, ProjectGoalInput, ProjectInvite, ProjectNotice, ProjectPlanRevisionApplyResult, ProjectPlanRevisionPreview, ProjectProgress, ProjectReminder, ProjectReminderInput, ProjectReport, ProjectSummary, ProjectTask, ProjectTaskInput, TaskProcessTurn, ProjectTodo, ProjectTodoInput, ReportStatus, Reminder, ReminderInput, ShareLinks, Task, TaskActionResponse, TeamToday, Todo, TodoActionResponse, TodoInput, TurnResponse } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  createGoal(title: string): Observable<{ goalId: string; phase: string; message: string }> {
    return this.http.post<{ goalId: string; phase: string; message: string }>(`${API_BASE}/goal`, { title });
  }

  // --- Guest (no-auth) flow ---
  createGuestGoal(title: string): Observable<{ goalId: string; phase: string; message: string }> {
    return this.http.post<{ goalId: string; phase: string; message: string }>(`${API_BASE}/guest/goal`, { title });
  }

  guestGetGoal(id: string): Observable<Goal> {
    return this.http.get<Goal>(`${API_BASE}/guest/goal/${id}`);
  }

  guestMessage(goalId: string, text: string): Observable<TurnResponse> {
    return this.http.post<TurnResponse>(`${API_BASE}/guest/message`, { goalId, text });
  }

  getGoal(id: string): Observable<Goal> {
    return this.http.get<Goal>(`${API_BASE}/goal/${id}`);
  }

  listGoals(): Observable<{ goals: GoalSummary[] }> {
    return this.http.get<{ goals: GoalSummary[] }>(`${API_BASE}/goals`);
  }

  deleteGoal(id: string): Observable<{ ok: boolean; goalId: string }> {
    return this.http.delete<{ ok: boolean; goalId: string }>(`${API_BASE}/goal/${id}`);
  }

  getPlan(id: string): Observable<{ plan: Plan | null; phase: string }> {
    return this.http.get<{ plan: Plan | null; phase: string }>(`${API_BASE}/goal/${id}/plan`);
  }

  sendMessage(goalId: string, text: string): Observable<TurnResponse> {
    return this.http.post<TurnResponse>(`${API_BASE}/message`, { goalId, text });
  }

  confirmGoal(goalId: string): Observable<{ type: string; plan: Plan }> {
    return this.http.post<{ type: string; plan: Plan }>(`${API_BASE}/goal/${goalId}/confirm`, {});
  }

  guestConfirm(goalId: string): Observable<{ type: string; plan: Plan }> {
    return this.http.post<{ type: string; plan: Plan }>(`${API_BASE}/guest/goal/${goalId}/confirm`, {});
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${API_BASE}/auth/change-password`, { currentPassword, newPassword });
  }

  // Set the Zenamaze's roast/motivation language; returns the refreshed user.
  updateLanguage(language: string): Observable<{ user: ZenamazeUser }> {
    return this.http.patch<{ user: ZenamazeUser }>(`${API_BASE}/account/language`, { language });
  }

  // Set the Zenamaze roast harshness level; returns the refreshed user.
  updateRoastLevel(roastLevel: string): Observable<{ user: ZenamazeUser }> {
    return this.http.patch<{ user: ZenamazeUser }>(`${API_BASE}/account/roast-level`, { roastLevel });
  }

  // Soft-delete the account: schedules permanent deletion after a 30-day grace
  // window (recoverable by logging back in). Requires the password to re-auth.
  deleteAccount(password: string): Observable<{ ok: boolean; purgeAfter?: string; graceDays?: number; message?: string }> {
    return this.http.delete<{ ok: boolean; purgeAfter?: string; graceDays?: number; message?: string }>(
      `${API_BASE}/account`,
      { body: { password } }
    );
  }

  today(): Observable<{ date: string; tasks: Task[] }> {
    return this.http.get<{ date: string; tasks: Task[] }>(`${API_BASE}/tasks/today`);
  }

  completeTask(taskId: string): Observable<TaskActionResponse> {
    return this.http.post<TaskActionResponse>(`${API_BASE}/tasks/${taskId}/complete`, {});
  }

  postponeTask(taskId: string): Observable<TaskActionResponse> {
    return this.http.post<TaskActionResponse>(`${API_BASE}/tasks/${taskId}/postpone`, {});
  }

  // Persist focus time spent so far (ms) so a session resumes instead of restarting.
  recordFocus(taskId: string, spentMs: number): Observable<{ task: Task }> {
    return this.http.post<{ task: Task }>(`${API_BASE}/tasks/${taskId}/focus`, { spentMs });
  }

  // Bank overtime minutes (worked past the estimate) onto the task's goal surplus.
  bankSurplus(taskId: string, minutes: number): Observable<{ surplusMinutes: number; goalId: string; banked: number }> {
    return this.http.post<{ surplusMinutes: number; goalId: string; banked: number }>(`${API_BASE}/tasks/${taskId}/surplus`, { minutes });
  }

  // Revising also records both turns in the goal's transcript, so the response
  // carries the Zenamaze's reply and the full updated message list.
  reviseGoal(goalId: string, feedback: string): Observable<{ plan: Plan; reply?: string; messages?: ChatMessage[] }> {
    return this.http.post<{ plan: Plan; reply?: string; messages?: ChatMessage[] }>(`${API_BASE}/goal/${goalId}/revise`, { feedback });
  }

  // Preview a plan revision WITHOUT applying it — returns the proposed plan only.
  previewRevision(goalId: string, feedback: string): Observable<{ plan: Plan; preview: boolean }> {
    return this.http.post<{ plan: Plan; preview: boolean }>(`${API_BASE}/goal/${goalId}/revise`, { feedback, preview: true });
  }

  // Commit the previewed revision; records both chat turns. Optionally sends a
  // merged plan (built from the user's per-item keep/replace choices) and the
  // ids of to-dos to also delete from the real to-do list.
  applyRevision(
    goalId: string,
    plan?: Plan,
    deleteTodoIds?: string[],
  ): Observable<{ plan: Plan; reply?: string; messages?: ChatMessage[]; revisionCount?: number; nudge?: boolean }> {
    return this.http.post<{ plan: Plan; reply?: string; messages?: ChatMessage[]; revisionCount?: number; nudge?: boolean }>(
      `${API_BASE}/goal/${goalId}/revise/apply`,
      { plan, deleteTodoIds },
    );
  }

  // Throw away a previewed-but-unapplied revision.
  discardRevision(goalId: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${API_BASE}/goal/${goalId}/revise/discard`, {});
  }

  // Edit a recurring "focus" task's weekday schedule / pause.
  updateFocus(goalId: string, focusId: string, patch: FocusPatch): Observable<{ plan: Plan }> {
    // focusId may be a title (older plans lacking an id) — encode it for the URL.
    return this.http.patch<{ plan: Plan }>(`${API_BASE}/goal/${goalId}/focus/${encodeURIComponent(focusId)}`, patch);
  }

  dashboard(): Observable<Dashboard> {
    return this.http.get<Dashboard>(`${API_BASE}/dashboard`);
  }

  // Completion-history analysis: calendar statuses, stats, weekday breakdown, roast.
  analysis(): Observable<Analysis> {
    return this.http.get<Analysis>(`${API_BASE}/analysis`);
  }

  // One day's done-vs-procrastinated task breakdown for the calendar drill-down.
  analysisDay(date: string): Observable<AnalysisDayDetail> {
    return this.http.get<AnalysisDayDetail>(`${API_BASE}/analysis/day?date=${date}`);
  }

  // --- Productivity score + medals + share ---
  productivityScore(): Observable<ProductivityScore> {
    return this.http.get<ProductivityScore>(`${API_BASE}/score`);
  }

  medals(): Observable<{ earned: Medal[]; locked: Medal[] }> {
    return this.http.get<{ earned: Medal[]; locked: Medal[] }>(`${API_BASE}/medals`);
  }

  // Mint (once) + fetch this user's public share links (unfurl page + card image).
  prepareShare(): Observable<ShareLinks> {
    return this.http.post<ShareLinks>(`${API_BASE}/share/prepare`, {});
  }

  // --- To-dos ---
  listTodos(status?: 'open' | 'done'): Observable<{ todos: Todo[] }> {
    const q = status ? `?status=${status}` : '';
    return this.http.get<{ todos: Todo[] }>(`${API_BASE}/todos${q}`);
  }

  todayTodos(): Observable<{ date: string; todos: Todo[] }> {
    return this.http.get<{ date: string; todos: Todo[] }>(`${API_BASE}/todos/today`);
  }

  createTodo(input: TodoInput): Observable<{ todo: Todo }> {
    return this.http.post<{ todo: Todo }>(`${API_BASE}/todos`, input);
  }

  updateTodo(id: string, input: TodoInput): Observable<{ todo: Todo }> {
    return this.http.patch<{ todo: Todo }>(`${API_BASE}/todo/${id}`, input);
  }

  completeTodo(id: string): Observable<TodoActionResponse> {
    return this.http.post<TodoActionResponse>(`${API_BASE}/todo/${id}/complete`, {});
  }

  reopenTodo(id: string): Observable<TodoActionResponse> {
    return this.http.post<TodoActionResponse>(`${API_BASE}/todo/${id}/reopen`, {});
  }

  deleteTodo(id: string): Observable<{ ok: boolean; todoId: string }> {
    return this.http.delete<{ ok: boolean; todoId: string }>(`${API_BASE}/todo/${id}`);
  }

  // --- Reminders ---
  listReminders(status?: 'active' | 'done'): Observable<{ reminders: Reminder[] }> {
    const q = status ? `?status=${status}` : '';
    return this.http.get<{ reminders: Reminder[] }>(`${API_BASE}/reminders${q}`);
  }

  remindersForDay(date?: string): Observable<{ date: string; reminders: Reminder[] }> {
    const q = date ? `?date=${date}` : '';
    return this.http.get<{ date: string; reminders: Reminder[] }>(`${API_BASE}/reminders/day${q}`);
  }

  createReminder(input: ReminderInput): Observable<{ reminder: Reminder }> {
    return this.http.post<{ reminder: Reminder }>(`${API_BASE}/reminders`, input);
  }

  updateReminder(id: string, input: ReminderInput): Observable<{ reminder: Reminder }> {
    return this.http.patch<{ reminder: Reminder }>(`${API_BASE}/reminder/${id}`, input);
  }

  snoozeReminder(id: string, minutes: number): Observable<{ reminder: Reminder }> {
    return this.http.post<{ reminder: Reminder }>(`${API_BASE}/reminder/${id}/snooze`, { minutes });
  }

  ackReminder(id: string): Observable<{ reminder: Reminder }> {
    return this.http.post<{ reminder: Reminder }>(`${API_BASE}/reminder/${id}/ack`, {});
  }

  deleteReminder(id: string): Observable<{ ok: boolean; reminderId: string }> {
    return this.http.delete<{ ok: boolean; reminderId: string }>(`${API_BASE}/reminder/${id}`);
  }

  // --- Notes (sticky notes) ---
  listNotes(): Observable<{ notes: Note[] }> {
    return this.http.get<{ notes: Note[] }>(`${API_BASE}/notes`);
  }

  createNote(input: NoteInput): Observable<{ note: Note }> {
    return this.http.post<{ note: Note }>(`${API_BASE}/notes`, input);
  }

  updateNote(id: string, input: NoteInput): Observable<{ note: Note }> {
    return this.http.patch<{ note: Note }>(`${API_BASE}/note/${id}`, input);
  }

  deleteNote(id: string): Observable<{ ok: boolean; noteId: string }> {
    return this.http.delete<{ ok: boolean; noteId: string }>(`${API_BASE}/note/${id}`);
  }

  // --- Connections (social graph) ---
  sendConnectionRequest(identifier: string): Observable<{ connection: unknown; target: ConnectionUser }> {
    return this.http.post<{ connection: unknown; target: ConnectionUser }>(`${API_BASE}/connections/request`, { identifier });
  }

  listConnections(): Observable<ConnectionsView> {
    return this.http.get<ConnectionsView>(`${API_BASE}/connections`);
  }

  acceptConnection(id: string): Observable<{ connection: ConnectionRow }> {
    return this.http.post<{ connection: ConnectionRow }>(`${API_BASE}/connection/${id}/accept`, {});
  }

  declineConnection(id: string): Observable<{ connection: ConnectionRow }> {
    return this.http.post<{ connection: ConnectionRow }>(`${API_BASE}/connection/${id}/decline`, {});
  }

  removeConnection(id: string): Observable<{ ok: boolean; connectionId: string }> {
    return this.http.delete<{ ok: boolean; connectionId: string }>(`${API_BASE}/connection/${id}`);
  }

  searchUsers(q: string): Observable<{ users: ConnectionUser[] }> {
    return this.http.get<{ users: ConnectionUser[] }>(`${API_BASE}/users/search?q=${encodeURIComponent(q)}`);
  }

  // --- Projects (team collaboration) ---
  createProject(name: string, description?: string): Observable<{ project: ProjectSummary; myRole: string }> {
    return this.http.post<{ project: ProjectSummary; myRole: string }>(`${API_BASE}/projects`, { name, description });
  }

  listProjects(): Observable<{ projects: ProjectSummary[]; invites: ProjectInvite[] }> {
    return this.http.get<{ projects: ProjectSummary[]; invites: ProjectInvite[] }>(`${API_BASE}/projects`);
  }

  getProject(id: string): Observable<ProjectDetail> {
    return this.http.get<ProjectDetail>(`${API_BASE}/project/${id}`);
  }

  updateProject(id: string, patch: { name?: string; description?: string | null }): Observable<ProjectDetail> {
    return this.http.patch<ProjectDetail>(`${API_BASE}/project/${id}`, patch);
  }

  deleteProject(id: string): Observable<{ ok: boolean; projectId: string }> {
    return this.http.delete<{ ok: boolean; projectId: string }>(`${API_BASE}/project/${id}`);
  }

  inviteToProject(id: string, userId: string): Observable<{ member: unknown; target: ConnectionUser }> {
    return this.http.post<{ member: unknown; target: ConnectionUser }>(`${API_BASE}/project/${id}/invite`, { userId });
  }

  respondProjectInvite(id: string, accept: boolean): Observable<{ ok: boolean; joined: boolean }> {
    return this.http.post<{ ok: boolean; joined: boolean }>(`${API_BASE}/project/${id}/invite/respond`, { accept });
  }

  leaveProject(id: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${API_BASE}/project/${id}/leave`, {});
  }

  removeProjectMember(id: string, userId: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${API_BASE}/project/${id}/member/${userId}`);
  }

  // --- Project goals + tasks ---
  createProjectGoal(projectId: string, input: ProjectGoalInput): Observable<ProjectGoal> {
    return this.http.post<ProjectGoal>(`${API_BASE}/project/${projectId}/goals`, input);
  }

  listProjectGoals(projectId: string): Observable<{ goals: ProjectGoal[] }> {
    return this.http.get<{ goals: ProjectGoal[] }>(`${API_BASE}/project/${projectId}/goals`);
  }

  updateProjectGoal(projectId: string, goalId: string, input: ProjectGoalInput): Observable<ProjectGoal> {
    return this.http.patch<ProjectGoal>(`${API_BASE}/project/${projectId}/goal/${goalId}`, input);
  }

  deleteProjectGoal(projectId: string, goalId: string): Observable<{ ok: boolean; projectGoalId: string }> {
    return this.http.delete<{ ok: boolean; projectGoalId: string }>(`${API_BASE}/project/${projectId}/goal/${goalId}`);
  }

  createProjectTask(projectId: string, goalId: string, input: ProjectTaskInput): Observable<ProjectTask> {
    return this.http.post<ProjectTask>(`${API_BASE}/project/${projectId}/goal/${goalId}/tasks`, input);
  }

  listProjectTasks(projectId: string, goalId: string): Observable<{ tasks: ProjectTask[] }> {
    return this.http.get<{ tasks: ProjectTask[] }>(`${API_BASE}/project/${projectId}/goal/${goalId}/tasks`);
  }

  updateProjectTask(taskId: string, input: ProjectTaskInput): Observable<ProjectTask> {
    return this.http.patch<ProjectTask>(`${API_BASE}/project/task/${taskId}`, input);
  }

  completeProjectTask(taskId: string): Observable<ProjectTask> {
    return this.http.post<ProjectTask>(`${API_BASE}/project/task/${taskId}/complete`, {});
  }

  // --- Task daily-process mini-interview ---
  startTaskProcess(taskId: string): Observable<TaskProcessTurn> {
    return this.http.post<TaskProcessTurn>(`${API_BASE}/project/task/${taskId}/process/start`, {});
  }

  taskProcessMessage(taskId: string, text: string): Observable<TaskProcessTurn> {
    return this.http.post<TaskProcessTurn>(`${API_BASE}/project/task/${taskId}/process/message`, { text });
  }

  confirmTaskProcess(taskId: string, input: { action?: string; minutes?: number; fireTime?: string }): Observable<{ task: ProjectTask; reminder: ProjectReminder }> {
    return this.http.post<{ task: ProjectTask; reminder: ProjectReminder }>(`${API_BASE}/project/task/${taskId}/process/confirm`, input);
  }

  skipTaskProcess(taskId: string): Observable<{ task: ProjectTask }> {
    return this.http.post<{ task: ProjectTask }>(`${API_BASE}/project/task/${taskId}/process/skip`, {});
  }

  reopenProjectTask(taskId: string): Observable<ProjectTask> {
    return this.http.post<ProjectTask>(`${API_BASE}/project/task/${taskId}/reopen`, {});
  }

  // Admin-only: advance a phase-gated task now (`{ activate: true }`) or hold it
  // back to a later date (`{ activatesOn }`).
  setProjectTaskGate(taskId: string, patch: { activate?: boolean; activatesOn?: string }): Observable<ProjectTask> {
    return this.http.post<ProjectTask>(`${API_BASE}/project/task/${taskId}/gate`, patch);
  }

  deleteProjectTask(taskId: string): Observable<{ ok: boolean; projectTaskId: string }> {
    return this.http.delete<{ ok: boolean; projectTaskId: string }>(`${API_BASE}/project/task/${taskId}`);
  }

  projectProgress(projectId: string): Observable<ProjectProgress> {
    return this.http.get<ProjectProgress>(`${API_BASE}/project/${projectId}/progress`);
  }

  // --- AI-guided project goals (shared discovery chat → plan) ---
  createProjectAiGoal(projectId: string, title?: string): Observable<{ projectGoalId: string; phase: string; message: string }> {
    return this.http.post<{ projectGoalId: string; phase: string; message: string }>(`${API_BASE}/project/${projectId}/ai-goals`, { title });
  }

  getProjectAiGoal(projectId: string, goalId: string): Observable<ProjectGoal> {
    return this.http.get<ProjectGoal>(`${API_BASE}/project/${projectId}/ai-goal/${goalId}`);
  }

  projectAiGoalMessage(projectId: string, goalId: string, text: string): Observable<TurnResponse> {
    return this.http.post<TurnResponse>(`${API_BASE}/project/${projectId}/ai-goal/${goalId}/message`, { text });
  }

  confirmProjectAiGoal(projectId: string, goalId: string): Observable<{ type: string; plan: Plan; tasksCreated: number }> {
    return this.http.post<{ type: string; plan: Plan; tasksCreated: number }>(`${API_BASE}/project/${projectId}/ai-goal/${goalId}/confirm`, {});
  }

  setProjectGoalCreation(projectId: string, goalCreation: 'owner' | 'members'): Observable<ProjectDetail> {
    return this.http.patch<ProjectDetail>(`${API_BASE}/project/${projectId}/goalCreation`, { goalCreation });
  }

  // --- Shared project to-dos ---
  listProjectTodos(projectId: string): Observable<{ todos: ProjectTodo[] }> {
    return this.http.get<{ todos: ProjectTodo[] }>(`${API_BASE}/project/${projectId}/todos`);
  }

  createProjectTodo(projectId: string, input: ProjectTodoInput): Observable<{ todo: ProjectTodo }> {
    return this.http.post<{ todo: ProjectTodo }>(`${API_BASE}/project/${projectId}/todos`, input);
  }

  updateProjectTodo(todoId: string, input: ProjectTodoInput): Observable<{ todo: ProjectTodo }> {
    return this.http.patch<{ todo: ProjectTodo }>(`${API_BASE}/project/todo/${todoId}`, input);
  }

  completeProjectTodo(todoId: string): Observable<{ todo: ProjectTodo }> {
    return this.http.post<{ todo: ProjectTodo }>(`${API_BASE}/project/todo/${todoId}/complete`, {});
  }

  reopenProjectTodo(todoId: string): Observable<{ todo: ProjectTodo }> {
    return this.http.post<{ todo: ProjectTodo }>(`${API_BASE}/project/todo/${todoId}/reopen`, {});
  }

  deleteProjectTodo(todoId: string): Observable<{ ok: boolean; projectTodoId: string }> {
    return this.http.delete<{ ok: boolean; projectTodoId: string }>(`${API_BASE}/project/todo/${todoId}`);
  }

  // --- Shared project reminders ---
  listProjectReminders(projectId: string): Observable<{ reminders: ProjectReminder[] }> {
    return this.http.get<{ reminders: ProjectReminder[] }>(`${API_BASE}/project/${projectId}/reminders`);
  }

  // Active reminders across ALL the caller's projects (for client fire-timers).
  activeProjectReminders(): Observable<{ reminders: ProjectReminder[] }> {
    return this.http.get<{ reminders: ProjectReminder[] }>(`${API_BASE}/project/reminders/active`);
  }

  createProjectReminder(projectId: string, input: ProjectReminderInput): Observable<{ reminder: ProjectReminder }> {
    return this.http.post<{ reminder: ProjectReminder }>(`${API_BASE}/project/${projectId}/reminders`, input);
  }

  updateProjectReminder(reminderId: string, input: ProjectReminderInput): Observable<{ reminder: ProjectReminder }> {
    return this.http.patch<{ reminder: ProjectReminder }>(`${API_BASE}/project/reminder/${reminderId}`, input);
  }

  snoozeProjectReminder(reminderId: string, minutes: number): Observable<{ reminder: ProjectReminder }> {
    return this.http.post<{ reminder: ProjectReminder }>(`${API_BASE}/project/reminder/${reminderId}/snooze`, { minutes });
  }

  ackProjectReminder(reminderId: string): Observable<{ reminder: ProjectReminder }> {
    return this.http.post<{ reminder: ProjectReminder }>(`${API_BASE}/project/reminder/${reminderId}/ack`, {});
  }

  deleteProjectReminder(reminderId: string): Observable<{ ok: boolean; projectReminderId: string }> {
    return this.http.delete<{ ok: boolean; projectReminderId: string }>(`${API_BASE}/project/reminder/${reminderId}`);
  }

  // --- Team checkpoints + progress reports + AI plan-adjustment ---
  listProjectCheckpoints(projectId: string, goalId: string): Observable<{ checkpoints: ProjectCheckpoint[] }> {
    return this.http.get<{ checkpoints: ProjectCheckpoint[] }>(`${API_BASE}/project/${projectId}/goal/${goalId}/checkpoints`);
  }

  submitCheckpointReport(
    projectId: string,
    goalId: string,
    checkpointId: string,
    body: { status: ReportStatus; note?: string },
  ): Observable<{ report: ProjectReport }> {
    return this.http.post<{ report: ProjectReport }>(`${API_BASE}/project/${projectId}/goal/${goalId}/checkpoint/${checkpointId}/report`, body);
  }

  // Anytime entry point — flag one of your own open project tasks blocked.
  flagTaskBlocked(taskId: string, note: string): Observable<{ report: ProjectReport }> {
    return this.http.post<{ report: ProjectReport }>(`${API_BASE}/project/task/${taskId}/blocker`, { note });
  }

  getCheckpointReport(reportId: string): Observable<{ report: ProjectReport }> {
    return this.http.get<{ report: ProjectReport }>(`${API_BASE}/project/report/${reportId}`);
  }

  regenerateCheckpointReport(reportId: string): Observable<{ report: ProjectReport }> {
    return this.http.post<{ report: ProjectReport }>(`${API_BASE}/project/report/${reportId}/regenerate`, {});
  }

  acceptCheckpointAction(reportId: string, actionId: string): Observable<{ report: ProjectReport; approvalRequest?: ActionApproval }> {
    return this.http.post<{ report: ProjectReport; approvalRequest?: ActionApproval }>(`${API_BASE}/project/report/${reportId}/action/${actionId}/accept`, {});
  }

  dismissCheckpointAction(reportId: string, actionId: string): Observable<{ report: ProjectReport }> {
    return this.http.post<{ report: ProjectReport }>(`${API_BASE}/project/report/${reportId}/action/${actionId}/dismiss`, {});
  }

  dismissCheckpointSuggestion(reportId: string): Observable<{ report: ProjectReport }> {
    return this.http.post<{ report: ProjectReport }>(`${API_BASE}/project/report/${reportId}/dismiss`, {});
  }

  // --- Reassign / reduce_scope approvals (owner/admin) ---
  listActionApprovals(projectId: string): Observable<{ approvals: ActionApproval[] }> {
    return this.http.get<{ approvals: ActionApproval[] }>(`${API_BASE}/project/${projectId}/approvals`);
  }

  pendingActionApprovals(): Observable<{ approvals: ActionApproval[] }> {
    return this.http.get<{ approvals: ActionApproval[] }>(`${API_BASE}/project/approvals/pending`);
  }

  approveAction(approvalId: string): Observable<{ approval: ActionApproval }> {
    return this.http.post<{ approval: ActionApproval }>(`${API_BASE}/project/approval/${approvalId}/approve`, {});
  }

  rejectAction(approvalId: string): Observable<{ approval: ActionApproval }> {
    return this.http.post<{ approval: ActionApproval }>(`${API_BASE}/project/approval/${approvalId}/reject`, {});
  }

  // --- Outcome notices ---
  projectNotices(unseenOnly?: boolean): Observable<{ notices: ProjectNotice[] }> {
    const q = unseenOnly ? '?unseenOnly=true' : '';
    return this.http.get<{ notices: ProjectNotice[] }>(`${API_BASE}/project/notices${q}`);
  }

  markProjectNoticeSeen(noticeId: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${API_BASE}/project/notice/${noticeId}/seen`, {});
  }

  // --- Today-page cross-project team feed ---
  myProjectTasks(): Observable<{ tasks: MyProjectTask[] }> {
    return this.http.get<{ tasks: MyProjectTask[] }>(`${API_BASE}/project/tasks/mine`);
  }

  myProjectTodos(): Observable<{ todos: MyProjectTodo[] }> {
    return this.http.get<{ todos: MyProjectTodo[] }>(`${API_BASE}/project/todos/mine`);
  }

  myPendingCheckpointReports(): Observable<{ checkpoints: PendingCheckpointReport[] }> {
    return this.http.get<{ checkpoints: PendingCheckpointReport[] }>(`${API_BASE}/project/checkpoints/pending-reports`);
  }

  // One consolidated fetch behind the Today page's team-item feed.
  teamToday(): Observable<TeamToday> {
    return this.http.get<TeamToday>(`${API_BASE}/today/team`);
  }

  // --- Team goal plan revision (owner/admin) ---
  // `newDeadline` (YYYY-MM-DD) is optional: when set it unlocks a deadline-
  // changing revision (the engine re-paces to that date + re-checks feasibility);
  // omit it to keep the committed deadline fixed.
  previewProjectRevision(projectId: string, goalId: string, feedback: string, newDeadline?: string): Observable<ProjectPlanRevisionPreview> {
    return this.http.post<ProjectPlanRevisionPreview>(`${API_BASE}/project/${projectId}/goal/${goalId}/revise/preview`, { feedback, newDeadline: newDeadline || null });
  }

  applyProjectRevision(projectId: string, goalId: string, plan: Plan): Observable<ProjectPlanRevisionApplyResult> {
    return this.http.post<ProjectPlanRevisionApplyResult>(`${API_BASE}/project/${projectId}/goal/${goalId}/revise/apply`, { plan });
  }
}
