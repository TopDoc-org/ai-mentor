import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import {
  ActionApproval, ChatMessage, ConnectionRow, ProjectCheckpoint, ProjectDetail, ProjectGoal, ProjectMember, ProjectPlanRevisionPreview, ProjectProgress, ProjectReminder, ProjectReminderInput,
  ProjectTask, ProjectTodo, ProjectTodoInput, Recurrence, ReminderPriority, TodoPriority, TodoSchedule,
} from '../../core/models';
import { BottomNavComponent } from '../../shared/bottom-nav.component';
import { TopBarComponent } from '../../shared/top-bar.component';
import { ReportModalComponent } from '../../shared/report-modal.component';
import { TaskProcessModalComponent } from './task-process-modal.component';
import { ReminderBus } from '../../core/reminder-bus.service';

interface ProjectTodoForm {
  title: string;
  notes: string;
  assigneeId: string;
  schedule: TodoSchedule;
  dueDate: string;
  startDate: string;
  endDate: string;
  priority: TodoPriority;
}

interface ProjectReminderForm {
  title: string;
  notes: string;
  assigneeId: string;
  fireDate: string;
  fireTime: string;
  recurrence: Recurrence;
  intervalDays: number;
  priority: ReminderPriority;
}

// One team project: members, invites (from accepted connections), and — once
// Phase 3/4 land — shared goals with cumulative progress + a leaderboard.
@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BottomNavComponent, TopBarComponent, ReportModalComponent, TaskProcessModalComponent],
  template: `
    <app-top-bar></app-top-bar>

    <div class="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto w-full px-4 md:px-6 lg:px-8 pt-6 md:pt-8 lg:pt-10 pb-24 md:pb-10">
      <a routerLink="/projects" class="text-body-sm text-slate-400 hover:text-white mb-1 inline-block">← Team Projects</a>

      @if (loading()) {
        <div class="py-20 flex justify-center"><div class="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin"></div></div>
      } @else {
      @if (project(); as p) {
        <div class="flex items-start justify-between mb-4 md:mb-6">
          <div class="min-w-0">
            <h1 class="text-display md:text-display-lg gradient-text truncate">{{ p.name }}</h1>
            @if (p.description) { <p class="text-body-sm text-slate-400 mt-1">{{ p.description }}</p> }
          </div>
          @if (isAdmin()) {
            <button class="btn-ghost text-caption !py-1.5 !px-3 shrink-0" (click)="inviterOpen.set(true)">+ Invite</button>
          }
        </div>

        @if (progress(); as prog) {
          <section class="glass p-4 md:p-5 mb-6 animate-fade-up">
            <div class="flex items-center justify-between mb-2">
              <h2 class="text-micro uppercase tracking-wider text-slate-400">Cumulative progress</h2>
              <span class="text-heading text-white font-bold">{{ prog.percent ?? 0 }}%</span>
            </div>
            <div class="h-2.5 rounded-full bg-white/10 overflow-hidden mb-1">
              <div class="h-full rounded-full" style="background-image:linear-gradient(90deg,#7c5cff,#b64dff)" [style.width.%]="prog.percent ?? 0"></div>
            </div>
            @if (prog.totalWeight === 0) {
              <p class="text-caption text-slate-500 mt-1">No tasks yet — add a goal and some tasks to start tracking progress.</p>
            } @else {
              <p class="text-caption text-slate-500 mt-1">{{ prog.doneWeight }} / {{ prog.totalWeight }} weighted effort done across {{ prog.goals.length }} goal{{ prog.goals.length === 1 ? '' : 's' }}</p>
            }

            @if (prog.leaderboard.length) {
              <h3 class="text-micro uppercase tracking-wider text-slate-400 mt-5 mb-2">Leaderboard (this project)</h3>
              @for (row of prog.leaderboard; track row.userId; let i = $index) {
                <div class="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="text-caption text-slate-500 w-4 shrink-0">{{ i + 1 }}</span>
                    <span class="text-white text-body-sm font-semibold truncate">{{ row.user?.name || 'Member' }}</span>
                    @if (row.atRisk) { <span class="chip !py-0.5 !px-1.5 text-micro text-flame border-flame/40 shrink-0">at risk</span> }
                  </div>
                  <span class="text-caption text-slate-400 shrink-0">
                    {{ row.contributionShare }}% share · {{ row.tasksDone }} task{{ row.tasksDone === 1 ? '' : 's' }}@if (row.onTimePct !== null) {<span> · {{ row.onTimePct }}% on-time</span>}
                  </span>
                </div>
              }
            }
          </section>
        }

        <section class="glass p-4 mb-6 animate-fade-up">
          <h2 class="text-micro uppercase tracking-wider text-slate-400 mb-3">Members</h2>
          @for (m of p.members; track m.userId) {
            <div class="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div class="min-w-0">
                <p class="text-white text-body-sm font-semibold truncate">{{ m.user?.name || 'Member' }}</p>
                <p class="text-caption text-slate-400 truncate">{{ m.user?.email }}</p>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="text-micro uppercase px-2 py-0.5 rounded-full border border-white/10 text-slate-300">{{ m.role }}</span>
                @if (isAdmin() && m.role !== 'owner' && m.userId !== myUserId()) {
                  <button class="text-caption text-slate-400 hover:text-red-400" (click)="removeMember(m)">Remove</button>
                }
              </div>
            </div>
          }
        </section>

        <section class="mb-6 animate-fade-up">
          <div class="flex items-center justify-between mb-3 gap-2">
            <h2 class="text-micro uppercase tracking-wider text-slate-400">Shared goals</h2>
            @if (canCreateGoal()) {
              <div class="flex gap-2 shrink-0">
                <a [routerLink]="['/project', p.projectId, 'ai-goal', 'new']" class="btn-primary text-caption !py-1.5 !px-3">✨ AI Goal</a>
                <button class="btn-ghost text-caption !py-1.5 !px-3" (click)="openGoalCreator()">+ Goal</button>
              </div>
            }
          </div>
          @if (p.myRole === 'owner') {
            <div class="flex items-center justify-between mb-3 rounded-xl border border-white/10 px-3 py-2">
              <span class="text-caption text-slate-400">Who can create goals</span>
              <div class="flex gap-1">
                <button class="text-caption px-2 py-1 rounded-lg" [ngClass]="p.goalCreation === 'owner' ? 'bg-accent text-white' : 'text-slate-400 hover:text-white'" (click)="setGoalCreation('owner')">Owner only</button>
                <button class="text-caption px-2 py-1 rounded-lg" [ngClass]="p.goalCreation === 'members' ? 'bg-accent text-white' : 'text-slate-400 hover:text-white'" (click)="setGoalCreation('members')">All members</button>
              </div>
            </div>
          }
          @if (goalsLoading()) {
            <div class="py-8 flex justify-center"><div class="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin"></div></div>
          } @else if (goalsError()) {
            <div class="glass p-6 text-center border border-flame/30">
              <p class="text-body-sm text-flame mb-2">{{ goalsError() }}</p>
              <button class="btn-ghost text-caption !py-1.5 !px-3" (click)="loadGoals()">Retry</button>
            </div>
          } @else if (goals().length === 0) {
            <div class="glass p-6 text-center">
              <p class="text-body-sm text-slate-400">No shared goals yet. Add one to start tracking work together.</p>
            </div>
          } @else {
            @for (g of goals(); track g.projectGoalId) {
              <div class="glass p-4 mb-3">
                @if (g.aiGoal && g.phase && g.phase !== 'done') {
                  <!-- AI goal still being set up via discovery chat -->
                  <a [routerLink]="['/project', p.projectId, 'ai-goal', g.projectGoalId]" class="flex items-center justify-between">
                    <div class="min-w-0">
                      <p class="text-white font-semibold truncate">{{ goalTitle(g) }}</p>
                      <p class="text-caption text-accent-soft">✨ AI goal · setup in progress — tap to continue</p>
                    </div>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-slate-400 shrink-0"><path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </a>
                } @else {
                <button class="w-full flex items-center justify-between text-left" (click)="toggleGoal(g.projectGoalId)">
                  <div class="min-w-0">
                    <p class="text-white font-semibold truncate">{{ goalTitle(g) }}@if (g.aiGoal) { <span class="text-caption text-accent-soft ml-1">✨ AI</span> }</p>
                    @if (g.description) { <p class="text-caption text-slate-400 truncate">{{ g.description }}</p> }
                    @if (g.targetDate || g.deadlineDate) { <p class="text-caption text-slate-500">Target: {{ g.targetDate || g.deadlineDate }}</p> }
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                       class="text-slate-400 transition-transform shrink-0" [class.rotate-180]="expandedGoalId() === g.projectGoalId">
                    <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>

                @if (expandedGoalId() === g.projectGoalId) {
                  <div class="mt-3 pt-3 border-t border-white/5">
                    @if (tasksLoading()) {
                      <div class="py-4 flex justify-center"><div class="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin"></div></div>
                    } @else {
                      @for (t of (tasksByGoal()[g.projectGoalId] || []); track t.projectTaskId) {
                        @if (isLocked(t)) {
                          <!-- Phase-gated task: locked until its date or an admin starts it -->
                          <div class="flex items-center gap-2 py-1.5 opacity-80">
                            <span class="h-5 w-5 rounded border border-gold/30 shrink-0 flex items-center justify-center text-caption text-gold" title="Locked until its phase starts">🔒</span>
                            <div class="min-w-0 flex-1">
                              <p class="text-body-sm text-slate-300 truncate">{{ t.title }}</p>
                              <p class="text-caption text-gold truncate">Starts {{ t.activatesOn }} · later phase</p>
                            </div>
                            @if (canCreateGoal()) {
                              <input type="date" class="input !py-1 !px-2 text-caption w-32 shrink-0" [(ngModel)]="holdDates[t.projectTaskId]" (change)="holdTask(g.projectGoalId, t)" title="Hold until a later date" />
                              <button class="text-caption text-accent-soft hover:text-white shrink-0 whitespace-nowrap" (click)="startTaskNow(g.projectGoalId, t)">Start now</button>
                            }
                          </div>
                        } @else {
                        <div class="flex items-center gap-2 py-1.5">
                          <button type="button" class="h-5 w-5 rounded border shrink-0 flex items-center justify-center text-caption"
                                  [ngClass]="t.status === 'done' ? 'bg-accent border-accent text-white' : 'border-white/20 text-transparent'"
                                  (click)="toggleTaskDone(g.projectGoalId, t)" [attr.aria-label]="t.status === 'done' ? 'Mark not done' : 'Mark done'">✓</button>
                          <div class="min-w-0 flex-1">
                            <p class="text-body-sm text-white truncate" [class.line-through]="t.status === 'done'" [class.text-slate-500]="t.status === 'done'">{{ t.title }}</p>
                            <div class="flex items-center gap-1.5 text-caption text-slate-400 mt-0.5">
                              <select class="bg-ink-900 border border-white/10 rounded px-1 py-0.5 text-caption text-slate-300 max-w-[9rem] focus:outline-none focus:border-accent"
                                      [ngModel]="t.assigneeId || ''" (ngModelChange)="reassignTask(g.projectGoalId, t, $event)"
                                      (click)="$event.stopPropagation()" title="Assign to a team member">
                                <option value="">Unassigned</option>
                                @for (m of (project()?.members || []); track m.userId) {
                                  <option [value]="m.userId">{{ m.user?.name || 'Member' }}</option>
                                }
                              </select>
                              <span class="truncate">weight {{ t.weight }}@if (t.dueDate) {<span> · due {{ t.dueDate }}</span>}</span>
                            </div>
                            @if (t.processStatus === 'active') {
                              <p class="text-caption text-accent-soft mt-0.5 truncate">⏱ Daily@if (t.processAction) {<span>: {{ t.processAction }}</span>}@if (t.processFireTime) {<span> · {{ t.processFireTime }}</span>}</p>
                            } @else if (t.status === 'open' && t.assigneeId === myUserId()) {
                              <button class="text-caption text-accent-soft hover:text-white mt-0.5" (click)="openProcessSetup(g.projectGoalId, t)">+ Set up daily process</button>
                            }
                          </div>
                          @if (isAtRiskTask(g.projectGoalId, t.projectTaskId)) { <span class="chip !py-0.5 !px-2 text-micro text-flame border-flame/40 shrink-0">at risk</span> }
                          @if (t.status === 'open' && t.assigneeId === myUserId()) {
                            <button class="text-caption text-slate-400 hover:text-flame shrink-0 whitespace-nowrap" (click)="flagBlocked(t)">Flag blocked</button>
                          }
                          <button class="text-caption text-slate-400 hover:text-red-400 shrink-0" (click)="deleteTask(g.projectGoalId, t)">Delete</button>
                        </div>
                        }
                      }
                      <div class="flex items-center justify-between mt-2">
                        <button class="btn-ghost text-caption !py-1.5 !px-3" (click)="openTaskCreator(g.projectGoalId)">+ Task</button>
                        <button class="text-caption text-slate-400 hover:text-red-400" (click)="confirmDeleteGoal.set(g)">Delete goal</button>
                      </div>

                      @if (g.aiGoal) {
                        <div class="mt-3 pt-3 border-t border-white/5">
                          <div class="flex items-center justify-between mb-2">
                            <h4 class="text-micro uppercase tracking-wider text-slate-400">Checkpoints</h4>
                            @if (canCreateGoal()) {
                              <button class="text-caption text-accent-soft hover:text-white" (click)="openRevise(g)">✨ Revise plan</button>
                            }
                          </div>
                          @if ((checkpointsByGoal()[g.projectGoalId] || []).length === 0) {
                            <p class="text-caption text-slate-500">No checkpoints yet.</p>
                          } @else {
                            @for (c of (checkpointsByGoal()[g.projectGoalId] || []); track c.projectCheckpointId) {
                              <div class="flex items-center justify-between gap-2 py-1.5 border-b border-white/5 last:border-0">
                                <div class="min-w-0">
                                  <p class="text-body-sm text-white truncate">{{ c.target }}</p>
                                  <p class="text-caption text-slate-400">{{ c.date }}{{ isPastDue(c.date) ? ' · past due' : '' }} · {{ c.reportsCount || 0 }} report{{ (c.reportsCount || 0) === 1 ? '' : 's' }}</p>
                                </div>
                                @if (isPastDue(c.date) && myOpenTaskInGoal(g.projectGoalId)) {
                                  <button class="btn-ghost text-caption !py-1 !px-2.5 shrink-0" (click)="openCheckpointReport(g, c)">Submit report</button>
                                }
                              </div>
                            }
                          }
                        </div>
                      }
                    }
                  </div>
                }
                }
              </div>
            }
          }
        </section>

        <!-- Pending team changes awaiting your sign-off (owner/admin only) -->
        @if (isAdmin() && approvals().length) {
          <section class="mb-6 animate-fade-up">
            <h2 class="text-micro uppercase tracking-wider text-slate-400 mb-3">Approvals pending</h2>
            <div class="glass p-4 space-y-3">
              @for (a of approvals(); track a.approvalId) {
                <div class="border-b border-white/5 last:border-0 pb-3 last:pb-0">
                  <p class="text-body-sm text-white font-semibold">
                    {{ a.actionType === 'revise_plan' ? 'Restructure plan: ' : (a.actionType === 'reassign' ? 'Reassign task: ' : 'Reduce scope: ') }}"{{ a.title }}"
                  </p>
                  <p class="text-caption text-slate-400 mt-0.5">Requested by {{ assigneeName(a.fromUserId, 'Someone') }}</p>
                  @if (a.actionType === 'reassign') { <p class="text-caption text-slate-400">To {{ assigneeName(a.toUserId, 'Unassigned') }}</p> }
                  @if (a.actionType === 'reduce_scope') { <p class="text-caption text-slate-400">New weight: {{ a.newWeight }}{{ a.newTitle ? ' · new title: ' + a.newTitle : '' }}</p> }
                  @if (a.actionType === 'revise_plan' && a.feedback) { <p class="text-caption text-slate-400 break-words">{{ a.feedback }}</p> }
                  <div class="flex gap-2 justify-end mt-2">
                    <button class="btn-ghost text-caption !py-1 !px-2.5" (click)="rejectApproval(a)">Reject</button>
                    <button class="btn-primary text-caption !py-1 !px-2.5" (click)="approveApproval(a)">Approve</button>
                  </div>
                </div>
              }
            </div>
          </section>
        }

        <!-- Shared to-dos (team checklist) -->
        <section class="mb-6 animate-fade-up">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-micro uppercase tracking-wider text-slate-400">Shared to-dos</h2>
            <button class="btn-ghost text-caption !py-1.5 !px-3" (click)="openTodoCreate()">+ New</button>
          </div>
          <div class="glass p-4">
            @if (todosLoading()) {
              <div class="py-4 flex justify-center"><div class="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin"></div></div>
            } @else if (todos().length === 0) {
              <p class="text-caption text-slate-500 text-center py-2">No shared to-dos yet.</p>
            } @else {
              @for (t of todos(); track t.projectTodoId) {
                <div class="flex items-start gap-2 py-1.5 border-b border-white/5 last:border-0">
                  <button type="button" class="mt-0.5 h-5 w-5 rounded border shrink-0 flex items-center justify-center text-caption"
                          [ngClass]="t.status === 'done' ? 'bg-accent border-accent text-white' : 'border-white/20 text-transparent'"
                          (click)="toggleTodo(t)" [attr.aria-label]="t.status === 'done' ? 'Reopen' : 'Complete'">✓</button>
                  <div class="min-w-0 flex-1">
                    <p class="text-body-sm text-white truncate" [class.line-through]="t.status === 'done'" [class.text-slate-500]="t.status === 'done'">{{ t.title }}</p>
                    @if (t.notes) { <p class="text-caption text-slate-400 mt-0.5 break-words">{{ t.notes }}</p> }
                    <div class="flex flex-wrap items-center gap-1.5 mt-1">
                      <span class="chip text-slate-300">{{ assigneeName(t.assigneeId) }}</span>
                      @if (todoScheduleLabel(t)) { <span class="chip" [ngClass]="t.overdue ? 'border-flame/40 text-flame' : 'text-slate-300'">{{ todoScheduleLabel(t) }}{{ t.overdue ? ' · overdue' : '' }}</span> }
                      @if (t.priority !== 'normal') { <span class="chip capitalize" [ngClass]="t.priority === 'high' ? 'text-flame border-flame/40' : 'text-slate-400'">{{ t.priority }}</span> }
                    </div>
                  </div>
                  <div class="flex flex-col items-end gap-1 shrink-0">
                    <button class="text-caption text-slate-400 hover:text-white" (click)="openTodoEdit(t)">Edit</button>
                    <button class="text-caption text-slate-500 hover:text-flame" (click)="deleteTodo2(t)">Delete</button>
                  </div>
                </div>
              }
            }
          </div>
        </section>

        <!-- Shared reminders (fire for all members) -->
        <section class="mb-6 animate-fade-up">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-micro uppercase tracking-wider text-slate-400">Shared reminders</h2>
            <button class="btn-ghost text-caption !py-1.5 !px-3" (click)="openReminderCreate()">+ New</button>
          </div>
          <div class="glass p-4">
            @if (remindersLoading()) {
              <div class="py-4 flex justify-center"><div class="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin"></div></div>
            } @else if (reminders().length === 0) {
              <p class="text-caption text-slate-500 text-center py-2">No shared reminders yet.</p>
            } @else {
              @for (r of reminders(); track r.projectReminderId) {
                <div class="flex items-start gap-2 py-1.5 border-b border-white/5 last:border-0">
                  <span class="h-8 w-8 rounded-xl flex items-center justify-center shrink-0" [style.background-image]="r.priority === 'high' ? 'linear-gradient(135deg,#ff5c5c,#ff8f3f)' : 'linear-gradient(135deg,#7c5cff,#b64dff)'">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="text-body-sm text-white truncate" [class.line-through]="r.doneToday" [class.text-slate-500]="r.doneToday">{{ r.title }}</p>
                    @if (r.notes) { <p class="text-caption text-slate-400 mt-0.5 break-words">{{ r.notes }}</p> }
                    <div class="flex flex-wrap items-center gap-1.5 mt-1">
                      <span class="chip text-slate-300">{{ assigneeName(r.assigneeId, 'Everyone') }}</span>
                      <span class="chip" [ngClass]="r.overdue && !r.doneToday ? 'border-flame/40 text-flame' : 'text-slate-300'">{{ r.whenLabel }}{{ r.overdue && !r.doneToday ? ' · overdue' : '' }}</span>
                      @if (r.recurrence === 'custom') {
                        <span class="chip text-accent-soft">↻ every {{ r.intervalDays }} days</span>
                      } @else if (r.recurrence !== 'none') {
                        <span class="chip text-accent-soft capitalize">↻ {{ r.recurrence }}</span>
                      }
                      @if (r.priority !== 'normal') { <span class="chip capitalize" [ngClass]="r.priority === 'high' ? 'text-flame border-flame/40' : 'text-slate-400'">{{ r.priority }}</span> }
                    </div>
                  </div>
                  <div class="flex flex-col items-end gap-1 shrink-0">
                    @if (!r.doneToday) { <button class="text-caption text-accent-soft hover:text-white" (click)="ackReminder(r)">Done</button> }
                    <button class="text-caption text-slate-400 hover:text-white" (click)="openReminderEdit(r)">Edit</button>
                    <button class="text-caption text-slate-500 hover:text-flame" (click)="deleteReminder(r)">Delete</button>
                  </div>
                </div>
              }
            }
          </div>
        </section>

        <div class="flex gap-2 justify-end">
          @if (p.myRole !== 'owner') {
            <button class="btn-ghost text-caption !py-1.5 !px-3 !text-flame" (click)="leave()">Leave project</button>
          } @else {
            <button class="btn-ghost text-caption !py-1.5 !px-3 !text-flame" (click)="confirmDeleteOpen.set(true)">Delete project</button>
          }
        </div>
      }
      }
    </div>

    <!-- Invite from connections -->
    @if (inviterOpen()) {
      <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" (click)="inviterOpen.set(false)">
        <div class="glass-strong w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[80vh] flex flex-col overflow-hidden" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <div class="p-5 overflow-y-auto flex-1">
          <h2 class="text-heading text-white font-bold mb-4">Invite a connection</h2>
          @if (invitableConnections().length === 0) {
            <p class="text-body-sm text-slate-400 mb-2">No connections left to invite. <a routerLink="/network" class="text-accent-soft underline">Connect with more people</a>.</p>
          } @else {
            <div class="space-y-2 mb-2">
              @for (c of invitableConnections(); track c.connectionId) {
                <div class="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2">
                  <div class="min-w-0">
                    <p class="text-white text-body-sm font-semibold truncate">{{ c.user?.name }}</p>
                    <p class="text-caption text-slate-400 truncate">{{ c.user?.email }}</p>
                  </div>
                  <button class="btn-primary text-caption !py-1.5 !px-3 shrink-0" (click)="invite(c)" [disabled]="inviting().has(c.user!.userId)">
                    {{ inviting().has(c.user!.userId) ? '…' : 'Invite' }}
                  </button>
                </div>
              }
            </div>
          }
          @if (inviteError()) { <p class="text-flame text-caption mb-2">{{ inviteError() }}</p> }
          </div>
          <div class="p-5 pt-4 border-t border-white/10 shrink-0">
            <button class="btn-ghost w-full text-sm !py-2" (click)="inviterOpen.set(false)">Close</button>
          </div>
        </div>
      </div>
    }

    <!-- New goal -->
    @if (goalCreatorOpen()) {
      <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" (click)="goalCreatorOpen.set(false)">
        <div class="glass-strong w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <div class="p-5 overflow-y-auto flex-1">
          <h2 class="text-heading text-white font-bold mb-4">New shared goal</h2>

          <label class="label">Title</label>
          <input class="input mb-3" [(ngModel)]="goalForm.title" placeholder="e.g. Ship the beta" />

          <label class="label">Description <span class="text-slate-500">(optional)</span></label>
          <textarea class="input resize-none mb-3" rows="2" [(ngModel)]="goalForm.description"></textarea>

          <label class="label">Target date <span class="text-slate-500">(optional)</span></label>
          <input class="input mb-3" type="date" [(ngModel)]="goalForm.targetDate" />

          @if (goalError()) { <p class="text-flame text-caption mb-3">{{ goalError() }}</p> }
          </div>

          <div class="flex gap-2 justify-end p-5 pt-4 border-t border-white/10 shrink-0">
            <button class="btn-ghost text-sm !py-2" (click)="goalCreatorOpen.set(false)">Cancel</button>
            <button class="btn-primary text-sm !py-2" (click)="createGoal()" [disabled]="goalCreating() || !goalForm.title.trim()">
              {{ goalCreating() ? 'Creating…' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- New task -->
    @if (taskCreatorGoalId(); as tgid) {
      <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" (click)="taskCreatorGoalId.set(null)">
        <div class="glass-strong w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <div class="p-5 overflow-y-auto flex-1">
          <h2 class="text-heading text-white font-bold mb-4">New task</h2>

          <label class="label">Title</label>
          <input class="input mb-3" [(ngModel)]="taskForm.title" placeholder="What needs to get done?" />

          <label class="label">Assign to <span class="text-slate-500">(optional)</span></label>
          <select class="input mb-3" [(ngModel)]="taskForm.assigneeId">
            <option value="">Unassigned</option>
            @for (m of (project()?.members || []); track m.userId) {
              <option [value]="m.userId">{{ m.user?.name || 'Member' }}</option>
            }
          </select>

          <label class="label">Weight <span class="text-slate-500">(effort — bigger tasks count more)</span></label>
          <input class="input mb-3" type="number" min="1" [(ngModel)]="taskForm.weight" />

          <label class="label">Due date <span class="text-slate-500">(optional)</span></label>
          <input class="input mb-3" type="date" [(ngModel)]="taskForm.dueDate" />

          @if (taskError()) { <p class="text-flame text-caption mb-3">{{ taskError() }}</p> }
          </div>

          <div class="flex gap-2 justify-end p-5 pt-4 border-t border-white/10 shrink-0">
            <button class="btn-ghost text-sm !py-2" (click)="taskCreatorGoalId.set(null)">Cancel</button>
            <button class="btn-primary text-sm !py-2" (click)="createTask(tgid)" [disabled]="taskCreating() || !taskForm.title.trim()">
              {{ taskCreating() ? 'Creating…' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- New / edit shared to-do -->
    @if (todoEditorOpen()) {
      <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" (click)="closeTodoEditor()">
        <div class="glass-strong w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <div class="p-5 overflow-y-auto flex-1">
          <h2 class="text-heading text-white font-bold mb-4">{{ todoEditingId() ? 'Edit shared to-do' : 'New shared to-do' }}</h2>

          <label class="label">Title</label>
          <input class="input mb-3" [(ngModel)]="todoForm.title" placeholder="What needs doing?" (keyup.enter)="saveTodo()" />

          <label class="label">Notes <span class="text-slate-500">(optional)</span></label>
          <textarea class="input resize-none mb-3" rows="2" [(ngModel)]="todoForm.notes" placeholder="Any detail…"></textarea>

          <label class="label">Assign to</label>
          <select class="input mb-3" [(ngModel)]="todoForm.assigneeId">
            <option value="">Anyone</option>
            @for (m of (project()?.members || []); track m.userId) { <option [value]="m.userId">{{ m.user?.name || 'Member' }}</option> }
          </select>

          <label class="label">When</label>
          <div class="flex flex-wrap gap-2 mb-3">
            @for (s of schedules; track s.value) {
              <button type="button" class="chip" [class.border-accent]="todoForm.schedule === s.value" [class.text-white]="todoForm.schedule === s.value" (click)="todoForm.schedule = s.value">{{ s.label }}</button>
            }
          </div>

          @if (todoForm.schedule === 'date' || todoForm.schedule === 'deadline') {
            <label class="label">{{ todoForm.schedule === 'deadline' ? 'By date' : 'Due date' }}</label>
            <input type="date" class="input mb-3" [(ngModel)]="todoForm.dueDate" />
          }
          @if (todoForm.schedule === 'span') {
            <div class="grid grid-cols-2 gap-3 mb-3">
              <div><label class="label">Start</label><input type="date" class="input" [(ngModel)]="todoForm.startDate" /></div>
              <div><label class="label">End</label><input type="date" class="input" [(ngModel)]="todoForm.endDate" /></div>
            </div>
          }

          <label class="label">Priority</label>
          <div class="flex gap-2 mb-4">
            @for (p of priorities; track p) {
              <button type="button" class="chip capitalize" [class.border-accent]="todoForm.priority === p" [class.text-white]="todoForm.priority === p" (click)="todoForm.priority = p">{{ p }}</button>
            }
          </div>

          @if (todoFormError()) { <p class="text-flame text-caption mb-3">{{ todoFormError() }}</p> }
          </div>

          <div class="flex gap-2 justify-end p-5 pt-4 border-t border-white/10 shrink-0">
            <button class="btn-ghost text-sm !py-2" (click)="closeTodoEditor()">Cancel</button>
            <button class="btn-primary text-sm !py-2" (click)="saveTodo()" [disabled]="todoSaving() || !todoForm.title.trim()">
              {{ todoSaving() ? 'Saving…' : (todoEditingId() ? 'Save' : 'Add to-do') }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- New / edit shared reminder -->
    @if (reminderEditorOpen()) {
      <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" (click)="closeReminderEditor()">
        <div class="glass-strong w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <div class="p-5 overflow-y-auto flex-1">
          <h2 class="text-heading text-white font-bold mb-4">{{ reminderEditingId() ? 'Edit shared reminder' : 'New shared reminder' }}</h2>

          <label class="label">Title</label>
          <input class="input mb-3" [(ngModel)]="reminderForm.title" placeholder="Remind the team to…" (keyup.enter)="saveReminder()" />

          <label class="label">Notes <span class="text-slate-500">(optional)</span></label>
          <textarea class="input resize-none mb-3" rows="2" [(ngModel)]="reminderForm.notes" placeholder="Any detail…"></textarea>

          <label class="label">Assign to</label>
          <select class="input mb-3" [(ngModel)]="reminderForm.assigneeId">
            <option value="">Everyone</option>
            @for (m of (project()?.members || []); track m.userId) { <option [value]="m.userId">{{ m.user?.name || 'Member' }}</option> }
          </select>

          <div class="grid grid-cols-2 gap-3 mb-3">
            <div><label class="label">Date</label><input type="date" class="input" [(ngModel)]="reminderForm.fireDate" /></div>
            <div><label class="label">Time <span class="text-slate-500">(optional)</span></label><input type="time" class="input" [(ngModel)]="reminderForm.fireTime" /></div>
          </div>

          <label class="label">Repeat</label>
          <div class="flex flex-wrap gap-2 mb-3">
            @for (o of recurrences; track o.value) {
              <button type="button" class="chip" [class.border-accent]="reminderForm.recurrence === o.value" [class.text-white]="reminderForm.recurrence === o.value" (click)="reminderForm.recurrence = o.value">{{ o.label }}</button>
            }
          </div>
          @if (reminderForm.recurrence === 'custom') {
            <div class="flex items-center gap-2 mb-3">
              <span class="text-body-sm text-slate-300">Every</span>
              <input type="number" min="1" max="365" class="input !w-20 text-center" [(ngModel)]="reminderForm.intervalDays" />
              <span class="text-body-sm text-slate-300">days</span>
            </div>
          }

          <label class="label">Priority</label>
          <div class="flex gap-2 mb-4">
            @for (p of priorities; track p) {
              <button type="button" class="chip capitalize" [class.border-accent]="reminderForm.priority === p" [class.text-white]="reminderForm.priority === p" (click)="reminderForm.priority = p">{{ p }}</button>
            }
          </div>

          @if (reminderFormError()) { <p class="text-flame text-caption mb-3">{{ reminderFormError() }}</p> }
          </div>

          <div class="flex gap-2 justify-end p-5 pt-4 border-t border-white/10 shrink-0">
            <button class="btn-ghost text-sm !py-2" (click)="closeReminderEditor()">Cancel</button>
            <button class="btn-primary text-sm !py-2" (click)="saveReminder()" [disabled]="reminderSaving() || !reminderForm.title.trim() || !reminderForm.fireDate">
              {{ reminderSaving() ? 'Saving…' : (reminderEditingId() ? 'Save' : 'Add reminder') }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Delete goal confirm -->
    @if (confirmDeleteGoal(); as g) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" (click)="confirmDeleteGoal.set(null)">
        <div class="glass-strong w-full max-w-sm rounded-3xl p-5" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <p class="text-white font-semibold mb-1">Delete this goal?</p>
          <p class="text-body-sm text-slate-400 mb-4 break-words">"{{ g.title }}" and all its tasks will be removed.</p>
          <div class="flex gap-2 justify-end">
            <button class="btn-ghost text-sm !py-2" (click)="confirmDeleteGoal.set(null)">Cancel</button>
            <button class="btn-primary text-sm !py-2 !bg-flame" (click)="deleteGoal(g)">Delete</button>
          </div>
        </div>
      </div>
    }

    <!-- Delete confirm -->
    @if (confirmDeleteOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" (click)="confirmDeleteOpen.set(false)">
        <div class="glass-strong w-full max-w-sm rounded-3xl p-5" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <p class="text-white font-semibold mb-1">Delete this project?</p>
          <p class="text-body-sm text-slate-400 mb-4">All goals, tasks, and membership will be removed for everyone. This can't be undone.</p>
          <div class="flex gap-2 justify-end">
            <button class="btn-ghost text-sm !py-2" (click)="confirmDeleteOpen.set(false)">Cancel</button>
            <button class="btn-primary text-sm !py-2 !bg-flame" (click)="deleteProject()">Delete</button>
          </div>
        </div>
      </div>
    }

    @if (toast(); as msg) {
      <div class="fixed bottom-28 md:bottom-8 inset-x-0 flex justify-center z-50 px-4 pointer-events-none">
        <div class="glass-strong px-4 py-2.5 rounded-full text-body-sm text-white animate-fade-up">{{ msg }}</div>
      </div>
    }

    @if (reportModal(); as rm) {
      <app-report-modal
        [mode]="rm.mode" [projectId]="rm.projectId" [goalId]="rm.goalId" [checkpointId]="rm.checkpointId"
        [checkpointTarget]="rm.checkpointTarget" [taskId]="rm.taskId" [taskTitle]="rm.taskTitle"
        (closed)="closeReportModal(rm.goalId)"></app-report-modal>
    }

    <!-- Daily-process mini-interview for a just-assigned task -->
    @if (processModal(); as pm) {
      <app-task-process-modal
        [taskId]="pm.taskId" [taskTitle]="pm.taskTitle"
        (attached)="onProcessAttached(pm.goalId)"
        (skipped)="onProcessSkipped(pm.goalId)"
        (closed)="processModal.set(null)"></app-task-process-modal>
    }

    <!-- Owner: revise team plan -->
    @if (reviseGoal(); as rg) {
      <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" (click)="closeRevise()">
        <div class="glass-strong w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col overflow-hidden" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <div class="p-5 overflow-y-auto flex-1">
          <h2 class="text-heading text-white font-bold mb-1">Revise the plan</h2>
          <p class="text-caption text-slate-400 mb-4">"{{ goalTitle(rg) }}" — chat with Zenamaze to restructure milestones, checkpoints, and tasks. Done work is kept. Set a new target date to move the deadline; leave it blank to keep it. Nothing changes until you lock it in.</p>

          <!-- Chat: ask questions or say what to change; Zenamaze replies each turn -->
          @if (reviseMessages().length || revisePreviewing()) {
            <div class="space-y-2 mb-3">
              @for (m of reviseMessages(); track $index) {
                <div class="flex" [class.justify-end]="m.role === 'user'">
                  <div class="max-w-[85%] rounded-2xl px-3 py-2 text-body-sm whitespace-pre-wrap" [ngClass]="m.role === 'user' ? 'bg-accent text-white rounded-br-sm' : 'glass text-slate-100 rounded-bl-sm'">{{ m.text }}</div>
                </div>
              }
              @if (revisePreviewing()) {
                <div class="flex"><div class="glass rounded-2xl rounded-bl-sm px-3 py-2"><div class="flex gap-1"><span class="h-2 w-2 rounded-full bg-slate-400 animate-bounce"></span><span class="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style="animation-delay:.15s"></span><span class="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style="animation-delay:.3s"></span></div></div></div>
              }
            </div>
          }

          <!-- Latest proposed plan (updates each turn; not applied until you lock) -->
          @if (revisePreview()) {
            @if (revisePreview()!.plan.deadlineDate) { <p class="text-caption text-slate-400 mb-1">🎯 New target date: {{ revisePreview()!.plan.deadlineDate }}</p> }
            <div class="glass rounded-xl p-3 mb-3">
              <p class="text-micro uppercase tracking-wider text-slate-400 mb-1">Proposed plan (not applied yet)</p>
              <div class="space-y-2 max-h-56 overflow-y-auto">
                @if (revisePreview()!.plan.recurringTasks.length) {
                  <p class="text-micro uppercase tracking-wider text-slate-400">Daily / weekly processes</p>
                  @for (r of revisePreview()!.plan.recurringTasks; track r.title) {
                    <div class="flex justify-between gap-2 text-body-sm text-slate-200"><span>{{ r.title }} <span class="text-caption text-slate-500">· {{ r.estMinutes }}m</span></span>@if (r.activatesOn) { <span class="text-caption text-gold shrink-0">🔒 starts {{ r.activatesOn }}</span> }</div>
                  }
                }
                @if (revisePreview()!.plan.milestones.length) {
                  <p class="text-micro uppercase tracking-wider text-slate-400 pt-1">Milestones</p>
                  @for (m of revisePreview()!.plan.milestones; track m.title) {
                    <div class="flex justify-between gap-2 text-body-sm text-slate-200"><span>{{ m.title }}</span><span class="text-caption text-slate-500 shrink-0">{{ m.targetDate }}</span></div>
                  }
                }
                @if (revisePreview()!.plan.oneOffTasks.length) {
                  <p class="text-micro uppercase tracking-wider text-slate-400 pt-1">One-off tasks</p>
                  @for (o of revisePreview()!.plan.oneOffTasks; track o.title) {
                    <div class="flex justify-between gap-2 text-body-sm text-slate-200"><span>{{ o.title }}</span><span class="text-caption text-slate-500 shrink-0">{{ o.dueDate }}</span></div>
                  }
                }
                @if (revisePreview()!.plan.checkpoints.length) {
                  <p class="text-micro uppercase tracking-wider text-slate-400 pt-1">Checkpoints</p>
                  @for (c of revisePreview()!.plan.checkpoints; track c.date) {
                    <div class="flex gap-2 text-body-sm text-slate-200"><span class="text-caption text-slate-500 shrink-0">{{ c.date }}</span><span>{{ c.target }}</span></div>
                  }
                }
              </div>
              <p class="text-micro uppercase tracking-wider text-slate-400 mt-2 mb-1">Changes</p>
              <div class="space-y-1.5 max-h-40 overflow-y-auto">
                @for (d of revisePreview()!.diff; track d.title) {
                  <div class="flex items-center gap-2 text-body-sm">
                    <span class="chip !py-0.5 !px-2 text-micro shrink-0"
                          [ngClass]="{ 'text-accent-soft border-accent/30': d.state === 'added', 'text-flame border-flame/40': d.state === 'removed', 'text-gold border-gold/30': d.state === 'changed' }">
                      {{ d.state }}
                    </span>
                    <span class="text-slate-200 truncate">{{ d.title }}</span>
                  </div>
                }
                @if (revisePreview()!.diff.length === 0) { <p class="text-caption text-slate-500">Only pacing/wording changed.</p> }
              </div>
            </div>
          } @else if (!reviseMessages().length) {
            <p class="text-caption text-slate-400 mb-2">Ask a question or say what to change. Zenamaze replies, and you can go back and forth — then lock it in.</p>
          }

          </div>

          <div class="p-5 pt-4 border-t border-white/10 shrink-0">
          @if (reviseError()) { <p class="text-flame text-caption mb-2">{{ reviseError() }}</p> }

          <!-- Composer -->
          <textarea class="input resize-none w-full" rows="2" [(ngModel)]="reviseText"
                    placeholder="e.g. What's a lead magnet? Or: the timeline is too stretched — hit it in 2 months." [disabled]="revisePreviewing()"></textarea>
          <label class="label mt-2">New target date (optional)</label>
          <input type="date" class="input w-full mb-3" [(ngModel)]="reviseDeadline" [disabled]="revisePreviewing()" />
          <div class="flex gap-2 justify-end">
            <button class="btn-ghost text-sm !py-2" (click)="closeRevise()" [disabled]="reviseApplying()">Cancel</button>
            <button class="btn-ghost text-sm !py-2" (click)="sendRevise()" [disabled]="revisePreviewing() || (!reviseText.trim() && !reviseDeadline)">
              {{ revisePreviewing() ? 'Thinking…' : (revisePreview() ? 'Send' : 'Ask / preview') }}
            </button>
            @if (revisePreview()) {
              <button class="btn-primary text-sm !py-2" (click)="applyRevise()" [disabled]="reviseApplying() || revisePreviewing()">
                {{ reviseApplying() ? 'Locking…' : 'Apply revision (lock)' }}
              </button>
            }
          </div>
          </div>
        </div>
      </div>
    }

    <app-bottom-nav></app-bottom-nav>
  `,
})
export class ProjectDetailComponent implements OnInit {
  loading = signal(true);
  project = signal<ProjectDetail | null>(null);
  myUserId = signal<string | null>(null);

  inviterOpen = signal(false);
  inviting = signal<Set<string>>(new Set());
  inviteError = signal<string | null>(null);
  connections = signal<ConnectionRow[]>([]);

  confirmDeleteOpen = signal(false);

  goals = signal<ProjectGoal[]>([]);
  goalsLoading = signal(false);
  goalsError = signal<string | null>(null);
  expandedGoalId = signal<string | null>(null);
  tasksByGoal = signal<Record<string, ProjectTask[]>>({});
  tasksLoading = signal(false);

  // Daily-process setup: which task's mini-interview modal is open, and which
  // tasks we've already auto-prompted this session (so we nag at most once).
  processModal = signal<{ taskId: string; taskTitle: string; goalId: string } | null>(null);
  private processPrompted = new Set<string>();
  checkpointsByGoal = signal<Record<string, ProjectCheckpoint[]>>({});

  reportModal = signal<{ mode: 'checkpoint' | 'blocker'; projectId: string; goalId: string; checkpointId: string; checkpointTarget: string; taskId: string; taskTitle: string } | null>(null);

  approvals = signal<ActionApproval[]>([]);

  reviseGoal = signal<ProjectGoal | null>(null);
  reviseText = '';
  reviseDeadline = '';
  reviseMessages = signal<ChatMessage[]>([]);
  // Per-task date buffer for the "Hold until" control on locked phase tasks.
  holdDates: Record<string, string> = {};
  revisePreview = signal<ProjectPlanRevisionPreview | null>(null);
  revisePreviewing = signal(false);
  reviseApplying = signal(false);
  reviseError = signal<string | null>(null);

  goalCreatorOpen = signal(false);
  goalCreating = signal(false);
  goalError = signal<string | null>(null);
  goalForm = { title: '', description: '', targetDate: '' };

  taskCreatorGoalId = signal<string | null>(null);
  taskCreating = signal(false);
  taskError = signal<string | null>(null);
  taskForm: { title: string; assigneeId: string; weight: number; dueDate: string } = { title: '', assigneeId: '', weight: 1, dueDate: '' };

  confirmDeleteGoal = signal<ProjectGoal | null>(null);

  progress = signal<ProjectProgress | null>(null);

  todos = signal<ProjectTodo[]>([]);
  todosLoading = signal(false);
  todoEditorOpen = signal(false);
  todoEditingId = signal<string | null>(null);
  todoSaving = signal(false);
  todoFormError = signal<string | null>(null);
  todoForm: ProjectTodoForm = this.blankTodoForm();

  reminders = signal<ProjectReminder[]>([]);
  remindersLoading = signal(false);
  reminderEditorOpen = signal(false);
  reminderEditingId = signal<string | null>(null);
  reminderSaving = signal(false);
  reminderFormError = signal<string | null>(null);
  reminderForm: ProjectReminderForm = this.blankReminderForm();

  schedules: { value: TodoSchedule; label: string }[] = [
    { value: 'date', label: 'On a date' },
    { value: 'deadline', label: 'By a deadline' },
    { value: 'span', label: 'Over a span' },
    { value: 'none', label: 'Someday' },
  ];
  recurrences: { value: Recurrence; label: string }[] = [
    { value: 'none', label: 'Once' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'custom', label: 'Custom' },
  ];
  priorities: TodoPriority[] = ['low', 'normal', 'high'];

  toast = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private projectId = '';

  isAdmin = () => {
    const role = this.project()?.myRole;
    return role === 'owner' || role === 'admin';
  };

  // Who may create goals honors the project's goalCreation setting.
  canCreateGoal = () => {
    const p = this.project();
    if (!p) return false;
    return p.goalCreation === 'members' || p.myRole === 'owner' || p.myRole === 'admin';
  };

  setGoalCreation(mode: 'owner' | 'members') {
    const p = this.project();
    if (!p || p.goalCreation === mode) return;
    this.api.setProjectGoalCreation(this.projectId, mode).subscribe({
      next: (updated) => { this.project.set(updated); this.showToast(mode === 'members' ? 'All members can create goals' : 'Only the owner can create goals'); },
      error: () => this.showToast('Could not update — try again'),
    });
  }

  // Users with a pending invite this session — getProject only returns ACTIVE
  // members, so a just-invited (still "invited") user wouldn't otherwise be
  // excluded from the invite picker until they accept and become active.
  invitedUserIds = signal<Set<string>>(new Set());

  // Accepted connections not already a member/invited on this project.
  invitableConnections = () => {
    const memberIds = new Set((this.project()?.members || []).map((m) => m.userId));
    const invited = this.invitedUserIds();
    return this.connections().filter((c) => c.user && !memberIds.has(c.user.userId) && !invited.has(c.user.userId));
  };

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router, private auth: AuthService, private reminderBus: ReminderBus) {}

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') || '';
    this.myUserId.set(this.auth.user()?.userId || null);
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.getProject(this.projectId).subscribe({
      next: (p) => {
        this.project.set(p);
        this.loading.set(false);
        if (this.isAdmin()) this.loadApprovals();
      },
      error: () => this.loading.set(false),
    });
    this.api.listConnections().subscribe({ next: (v) => this.connections.set(v.accepted) });
    this.loadGoals();
    this.loadProgress();
    this.loadTodos();
  }

  loadApprovals() {
    this.api.listActionApprovals(this.projectId).subscribe({
      next: (r) => this.approvals.set(r.approvals || []),
      error: () => {},
    });
  }

  approveApproval(a: ActionApproval) {
    this.api.approveAction(a.approvalId).subscribe({
      next: () => { this.showToast('Approved'); this.loadApprovals(); this.loadGoals(); this.loadProgress(); },
      error: (e) => this.showToast(e?.error?.message || 'Could not approve — try again'),
    });
  }

  rejectApproval(a: ActionApproval) {
    this.api.rejectAction(a.approvalId).subscribe({
      next: () => { this.showToast('Rejected'); this.loadApprovals(); },
      error: () => this.showToast('Could not reject — try again'),
    });
  }

  loadProgress() {
    this.api.projectProgress(this.projectId).subscribe({ next: (p) => this.progress.set(p) });
  }

  loadTodos() {
    this.todosLoading.set(true);
    this.api.listProjectTodos(this.projectId).subscribe({
      next: (r) => { this.todos.set(r.todos || []); this.todosLoading.set(false); },
      error: () => this.todosLoading.set(false),
    });
    this.loadReminders();
  }

  loadReminders() {
    this.remindersLoading.set(true);
    this.api.listProjectReminders(this.projectId).subscribe({
      next: (r) => { this.reminders.set(r.reminders || []); this.remindersLoading.set(false); },
      error: () => this.remindersLoading.set(false),
    });
  }

  private blankReminderForm(): ProjectReminderForm {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return { title: '', notes: '', assigneeId: '', fireDate: iso, fireTime: '', recurrence: 'none', intervalDays: 14, priority: 'normal' };
  }

  openReminderCreate() {
    this.reminderForm = this.blankReminderForm();
    this.reminderEditingId.set(null);
    this.reminderFormError.set(null);
    this.reminderEditorOpen.set(true);
  }

  openReminderEdit(r: ProjectReminder) {
    this.reminderForm = {
      title: r.title,
      notes: r.notes || '',
      assigneeId: r.assigneeId || '',
      fireDate: r.fireDate,
      fireTime: r.fireTime || '',
      recurrence: r.recurrence,
      intervalDays: r.intervalDays || 14,
      priority: r.priority,
    };
    this.reminderEditingId.set(r.projectReminderId);
    this.reminderFormError.set(null);
    this.reminderEditorOpen.set(true);
  }

  closeReminderEditor() {
    this.reminderEditorOpen.set(false);
  }

  private buildReminderPayload(): ProjectReminderInput | null {
    const title = this.reminderForm.title.trim();
    if (!title) return null;
    if (!this.reminderForm.fireDate) { this.reminderFormError.set('Pick a date.'); return null; }
    const custom = this.reminderForm.recurrence === 'custom';
    const interval = Math.trunc(Number(this.reminderForm.intervalDays));
    if (custom && (!Number.isInteger(interval) || interval < 1 || interval > 365)) {
      this.reminderFormError.set('Enter a repeat interval between 1 and 365 days.');
      return null;
    }
    return {
      title,
      notes: this.reminderForm.notes.trim() || null,
      assigneeId: this.reminderForm.assigneeId || null,
      fireDate: this.reminderForm.fireDate,
      fireTime: this.reminderForm.fireTime || null,
      recurrence: this.reminderForm.recurrence,
      intervalDays: custom ? interval : null,
      priority: this.reminderForm.priority,
    };
  }

  saveReminder() {
    this.reminderFormError.set(null);
    const payload = this.buildReminderPayload();
    if (!payload || this.reminderSaving()) return;
    this.reminderSaving.set(true);
    const id = this.reminderEditingId();
    const req = id ? this.api.updateProjectReminder(id, payload) : this.api.createProjectReminder(this.projectId, payload);
    req.subscribe({
      next: () => {
        this.reminderSaving.set(false);
        this.reminderEditorOpen.set(false);
        this.showToast(id ? 'Updated' : 'Reminder added');
        this.loadReminders();
      },
      error: (e) => {
        this.reminderSaving.set(false);
        this.reminderFormError.set(e?.error?.message || 'Something went wrong.');
      },
    });
  }

  ackReminder(r: ProjectReminder) {
    this.api.ackProjectReminder(r.projectReminderId).subscribe({
      next: () => { this.showToast('Marked done'); this.loadReminders(); },
      error: () => this.showToast('Could not update — try again'),
    });
  }

  deleteReminder(r: ProjectReminder) {
    this.api.deleteProjectReminder(r.projectReminderId).subscribe({
      next: () => this.loadReminders(),
      error: () => this.showToast('Could not delete — try again'),
    });
  }

  private blankTodoForm(): ProjectTodoForm {
    return { title: '', notes: '', assigneeId: '', schedule: 'none', dueDate: '', startDate: '', endDate: '', priority: 'normal' };
  }

  openTodoCreate() {
    this.todoForm = this.blankTodoForm();
    this.todoEditingId.set(null);
    this.todoFormError.set(null);
    this.todoEditorOpen.set(true);
  }

  openTodoEdit(t: ProjectTodo) {
    this.todoForm = {
      title: t.title,
      notes: t.notes || '',
      assigneeId: t.assigneeId || '',
      schedule: t.schedule,
      dueDate: t.dueDate || '',
      startDate: t.startDate || '',
      endDate: t.endDate || '',
      priority: t.priority,
    };
    this.todoEditingId.set(t.projectTodoId);
    this.todoFormError.set(null);
    this.todoEditorOpen.set(true);
  }

  closeTodoEditor() {
    this.todoEditorOpen.set(false);
  }

  private buildTodoPayload(): ProjectTodoInput | null {
    const title = this.todoForm.title.trim();
    if (!title) return null;
    const p: ProjectTodoInput = {
      title,
      notes: this.todoForm.notes.trim() || null,
      assigneeId: this.todoForm.assigneeId || null,
      priority: this.todoForm.priority,
      schedule: this.todoForm.schedule,
      dueDate: null,
      startDate: null,
      endDate: null,
    };
    if (this.todoForm.schedule === 'date' || this.todoForm.schedule === 'deadline') {
      if (!this.todoForm.dueDate) { this.todoFormError.set('Pick a date.'); return null; }
      p.dueDate = this.todoForm.dueDate;
    } else if (this.todoForm.schedule === 'span') {
      if (!this.todoForm.startDate || !this.todoForm.endDate) { this.todoFormError.set('Pick a start and end date.'); return null; }
      if (this.todoForm.startDate > this.todoForm.endDate) { this.todoFormError.set('Start must be on or before end.'); return null; }
      p.startDate = this.todoForm.startDate;
      p.endDate = this.todoForm.endDate;
    }
    return p;
  }

  saveTodo() {
    this.todoFormError.set(null);
    const payload = this.buildTodoPayload();
    if (!payload || this.todoSaving()) return;
    this.todoSaving.set(true);
    const id = this.todoEditingId();
    const req = id ? this.api.updateProjectTodo(id, payload) : this.api.createProjectTodo(this.projectId, payload);
    req.subscribe({
      next: () => {
        this.todoSaving.set(false);
        this.todoEditorOpen.set(false);
        this.showToast(id ? 'Updated' : 'Added');
        this.loadTodos();
      },
      error: (e) => {
        this.todoSaving.set(false);
        this.todoFormError.set(e?.error?.message || 'Something went wrong.');
      },
    });
  }

  todoScheduleLabel(t: ProjectTodo): string {
    const d = (s: string | null) => (s ? new Date(s + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '');
    switch (t.schedule) {
      case 'date': return d(t.dueDate);
      case 'deadline': return t.dueDate ? 'by ' + d(t.dueDate) : '';
      case 'span': return `${d(t.startDate)}–${d(t.endDate)}`;
      default: return '';
    }
  }

  toggleTodo(t: ProjectTodo) {
    const req = t.status === 'done' ? this.api.reopenProjectTodo(t.projectTodoId) : this.api.completeProjectTodo(t.projectTodoId);
    req.subscribe({ next: () => this.loadTodos(), error: () => this.showToast('Could not update — try again') });
  }

  deleteTodo2(t: ProjectTodo) {
    this.api.deleteProjectTodo(t.projectTodoId).subscribe({ next: () => this.loadTodos(), error: () => this.showToast('Could not delete — try again') });
  }

  loadGoals() {
    this.goalsLoading.set(true);
    this.goalsError.set(null);
    this.api.listProjectGoals(this.projectId).subscribe({
      next: (r) => {
        this.goals.set(r.goals || []);
        this.goalsLoading.set(false);
      },
      error: (e) => {
        this.goalsLoading.set(false);
        const status = e?.status ? ` (HTTP ${e.status})` : '';
        this.goalsError.set((e?.error?.message || 'Could not load goals — check your connection or sign in again.') + status);
        console.error('listProjectGoals failed', e);
      },
    });
    this.loadProgress();
  }

  // Display title for a goal. AI goals start as "Untitled goal" until the
  // interview captures the stated goal / the plan is built — fall back to the
  // captured surfaceGoal, then the first user message, so the board never shows
  // a bare "Untitled goal".
  goalTitle(g: ProjectGoal): string {
    const t = String(g.title || '').trim();
    if (t && t !== 'Untitled goal') return t;
    const surface = g.discoveryState?.collected?.['surfaceGoal'];
    if (surface) return String(surface).slice(0, 120);
    const firstUser = (g.messages || []).find((m) => m.role === 'user');
    if (firstUser?.text) return firstUser.text.slice(0, 120);
    return 'New AI goal';
  }

  assigneeName(assigneeId: string | null, unassignedLabel = 'Unassigned'): string {
    if (!assigneeId) return unassignedLabel;
    const m = (this.project()?.members || []).find((x) => x.userId === assigneeId);
    return m?.user?.name || 'Member';
  }

  toggleGoal(goalId: string) {
    if (this.expandedGoalId() === goalId) {
      this.expandedGoalId.set(null);
      return;
    }
    this.expandedGoalId.set(goalId);
    this.tasksLoading.set(true);
    this.api.listProjectTasks(this.projectId, goalId).subscribe({
      next: (r) => {
        const tasks = this.sortByDue(r.tasks || []);
        this.tasksByGoal.set({ ...this.tasksByGoal(), [goalId]: tasks });
        this.tasksLoading.set(false);
        this.maybeAutoPromptProcess(goalId, tasks);
      },
      error: () => this.tasksLoading.set(false),
    });
    const g = this.goals().find((x) => x.projectGoalId === goalId);
    if (g?.aiGoal) this.loadCheckpoints(goalId);
  }

  private reloadTasks(goalId: string) {
    this.api.listProjectTasks(this.projectId, goalId).subscribe({
      next: (r) => {
        const tasks = this.sortByDue(r.tasks || []);
        this.tasksByGoal.set({ ...this.tasksByGoal(), [goalId]: tasks });
        this.maybeAutoPromptProcess(goalId, tasks);
      },
    });
    this.loadProgress();
  }

  // Auto-open the daily-process mini-interview when a task assigned to ME is
  // freshly `pending_setup` — whether I just self-claimed it or an owner assigned
  // it to me. At most one prompt per task per session; a manual re-entry link on
  // the row stays available if I skip.
  private maybeAutoPromptProcess(goalId: string, tasks: ProjectTask[]) {
    if (this.processModal()) return;
    const me = this.myUserId();
    if (!me) return;
    const t = tasks.find(
      (x) => x.assigneeId === me && x.status === 'open' && x.processStatus === 'pending_setup' && !this.processPrompted.has(x.projectTaskId),
    );
    if (t) this.openProcessSetup(goalId, t);
  }

  openProcessSetup(goalId: string, t: ProjectTask) {
    this.processPrompted.add(t.projectTaskId);
    this.processModal.set({ taskId: t.projectTaskId, taskTitle: t.title, goalId });
  }

  onProcessAttached(goalId: string) {
    this.processModal.set(null);
    this.reminderBus.notifyChanged(); // re-arm fire timers + OS notification now
    this.showToast('Daily process set — reminder added');
    this.reloadTasks(goalId);
  }

  onProcessSkipped(goalId: string) {
    this.processModal.set(null);
    this.reloadTasks(goalId);
  }

  // Order tasks so the user can follow them in sequence: earliest due date first,
  // undated tasks last (then stable by title). Locked/phase-gated tasks still
  // sort by their date like everything else.
  private sortByDue(tasks: ProjectTask[]): ProjectTask[] {
    return [...tasks].sort((a, b) => {
      const da = a.dueDate || '';
      const db = b.dueDate || '';
      if (!da && !db) return a.title.localeCompare(b.title);
      if (!da) return 1;
      if (!db) return -1;
      if (da !== db) return da < db ? -1 : 1;
      return a.title.localeCompare(b.title);
    });
  }

  loadCheckpoints(goalId: string) {
    this.api.listProjectCheckpoints(this.projectId, goalId).subscribe({
      next: (r) => this.checkpointsByGoal.set({ ...this.checkpointsByGoal(), [goalId]: r.checkpoints || [] }),
      error: () => {},
    });
  }

  isPastDue(dateStr: string): boolean {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return dateStr <= iso;
  }

  myOpenTaskInGoal(goalId: string): boolean {
    const me = this.myUserId();
    return (this.tasksByGoal()[goalId] || []).some((t) => t.assigneeId === me && t.status === 'open');
  }

  isAtRiskTask(goalId: string, taskId: string): boolean {
    const gp = (this.progress()?.goals || []).find((x) => x.projectGoalId === goalId);
    return !!gp?.atRiskTaskIds?.includes(taskId);
  }

  // Anytime entry point — flag one of MY OWN open tasks blocked.
  flagBlocked(t: ProjectTask) {
    this.reportModal.set({ mode: 'blocker', projectId: '', goalId: '', checkpointId: '', checkpointTarget: '', taskId: t.projectTaskId, taskTitle: t.title });
  }

  openCheckpointReport(g: ProjectGoal, c: ProjectCheckpoint) {
    this.reportModal.set({ mode: 'checkpoint', projectId: this.projectId, goalId: g.projectGoalId, checkpointId: c.projectCheckpointId, checkpointTarget: c.target, taskId: '', taskTitle: '' });
  }

  closeReportModal(goalId: string) {
    this.reportModal.set(null);
    this.reloadTasks(goalId);
    if (goalId) this.loadCheckpoints(goalId);
  }

  // --- Phase-gated (sequential) tasks -----------------------------------------
  // A later-phase task is locked while flagged gated AND its start date is still
  // ahead — mirrors the backend's isGated (progress + board both hide it).
  private todayStr() { return new Date().toISOString().slice(0, 10); }

  isLocked(t: ProjectTask): boolean {
    return !!(t && t.gated && t.activatesOn && this.todayStr() < t.activatesOn);
  }

  startTaskNow(goalId: string, t: ProjectTask) {
    this.api.setProjectTaskGate(t.projectTaskId, { activate: true }).subscribe({
      next: () => this.reloadTasks(goalId),
      error: (e) => this.showToast(e?.error?.message || 'Could not start the task'),
    });
  }

  holdTask(goalId: string, t: ProjectTask) {
    const date = this.holdDates[t.projectTaskId];
    if (!date) return;
    this.api.setProjectTaskGate(t.projectTaskId, { activatesOn: date }).subscribe({
      next: () => this.reloadTasks(goalId),
      error: (e) => this.showToast(e?.error?.message || 'Could not hold the task'),
    });
  }

  // --- Owner/admin: revise the team plan ---
  openRevise(g: ProjectGoal) {
    this.reviseGoal.set(g);
    this.reviseText = '';
    this.reviseDeadline = '';
    this.reviseMessages.set([]);
    this.revisePreview.set(null);
    this.reviseError.set(null);
  }

  closeRevise() {
    if (this.revisePreviewing() || this.reviseApplying()) return;
    this.reviseGoal.set(null);
    this.reviseMessages.set([]);
    this.revisePreview.set(null);
  }

  // Full revise chat, formatted so the model keeps back-and-forth context each
  // turn (answers questions / asks for clarity, re-proposes a plan — nothing is
  // applied until the user locks it).
  private reviseTranscript(): string {
    return this.reviseMessages().map((m) => `${m.role === 'user' ? 'User' : 'Zenamaze'}: ${m.text}`).join('\n');
  }

  sendRevise() {
    const g = this.reviseGoal();
    const text = this.reviseText.trim();
    const deadline = this.reviseDeadline || undefined;
    if (!g || (!text && !deadline) || this.revisePreviewing()) return;
    const userLine = text || `(Set the new target date to ${deadline}.)`;
    this.reviseMessages.set([...this.reviseMessages(), { role: 'user', text: userLine }]);
    this.reviseText = '';
    this.revisePreviewing.set(true);
    this.reviseError.set(null);
    this.api.previewProjectRevision(this.projectId, g.projectGoalId, this.reviseTranscript(), deadline).subscribe({
      next: (r) => {
        this.revisePreviewing.set(false);
        this.revisePreview.set(r);
        this.reviseMessages.set([...this.reviseMessages(), { role: 'assistant', text: r.reply || 'Updated the proposed plan below — review it and lock it in when ready.' }]);
      },
      error: (e) => { this.revisePreviewing.set(false); this.reviseError.set(e?.error?.message || 'Could not reach Zenamaze — try again.'); },
    });
  }

  applyRevise() {
    const g = this.reviseGoal();
    const preview = this.revisePreview();
    if (!g || !preview || this.reviseApplying()) return;
    this.reviseApplying.set(true);
    this.reviseError.set(null);
    this.api.applyProjectRevision(this.projectId, g.projectGoalId, preview.plan).subscribe({
      next: () => {
        this.reviseApplying.set(false);
        this.reviseGoal.set(null);
        this.reviseMessages.set([]);
        this.revisePreview.set(null);
        this.showToast('Plan revised');
        this.loadGoals();
        this.reloadTasks(g.projectGoalId);
        this.loadCheckpoints(g.projectGoalId);
      },
      error: (e) => { this.reviseApplying.set(false); this.reviseError.set(e?.error?.message || 'Could not apply — try again.'); },
    });
  }

  openGoalCreator() {
    this.goalForm = { title: '', description: '', targetDate: '' };
    this.goalError.set(null);
    this.goalCreatorOpen.set(true);
  }

  createGoal() {
    const title = this.goalForm.title.trim();
    if (!title || this.goalCreating()) return;
    this.goalCreating.set(true);
    this.goalError.set(null);
    this.api
      .createProjectGoal(this.projectId, {
        title,
        description: this.goalForm.description.trim() || null,
        targetDate: this.goalForm.targetDate || null,
      })
      .subscribe({
        next: () => {
          this.goalCreating.set(false);
          this.goalCreatorOpen.set(false);
          this.loadGoals();
        },
        error: (e) => {
          this.goalCreating.set(false);
          this.goalError.set(e?.error?.message || 'Something went wrong.');
        },
      });
  }

  deleteGoal(g: ProjectGoal) {
    this.confirmDeleteGoal.set(null);
    this.api.deleteProjectGoal(this.projectId, g.projectGoalId).subscribe({
      next: () => {
        if (this.expandedGoalId() === g.projectGoalId) this.expandedGoalId.set(null);
        this.showToast('Goal deleted');
        this.loadGoals();
      },
      error: () => this.showToast('Could not delete — try again'),
    });
  }

  openTaskCreator(goalId: string) {
    this.taskForm = { title: '', assigneeId: '', weight: 1, dueDate: '' };
    this.taskError.set(null);
    this.taskCreatorGoalId.set(goalId);
  }

  createTask(goalId: string) {
    const title = this.taskForm.title.trim();
    if (!title || this.taskCreating()) return;
    this.taskCreating.set(true);
    this.taskError.set(null);
    this.api
      .createProjectTask(this.projectId, goalId, {
        title,
        assigneeId: this.taskForm.assigneeId || null,
        weight: Number(this.taskForm.weight) || 1,
        dueDate: this.taskForm.dueDate || null,
      })
      .subscribe({
        next: () => {
          this.taskCreating.set(false);
          this.taskCreatorGoalId.set(null);
          this.reloadTasks(goalId);
        },
        error: (e) => {
          this.taskCreating.set(false);
          this.taskError.set(e?.error?.message || 'Something went wrong.');
        },
      });
  }

  toggleTaskDone(goalId: string, t: ProjectTask) {
    const req = t.status === 'done' ? this.api.reopenProjectTask(t.projectTaskId) : this.api.completeProjectTask(t.projectTaskId);
    req.subscribe({
      next: () => this.reloadTasks(goalId),
      error: () => this.showToast('Could not update — try again'),
    });
  }

  deleteTask(goalId: string, t: ProjectTask) {
    this.api.deleteProjectTask(t.projectTaskId).subscribe({
      next: () => this.reloadTasks(goalId),
      error: () => this.showToast('Could not delete — try again'),
    });
  }

  reassignTask(goalId: string, t: ProjectTask, assigneeId: string) {
    const next = assigneeId || null;
    if (next === (t.assigneeId || null)) return;
    this.api.updateProjectTask(t.projectTaskId, { assigneeId: next }).subscribe({
      next: () => this.reloadTasks(goalId),
      error: () => this.showToast('Could not reassign — try again'),
    });
  }

  invite(c: ConnectionRow) {
    if (!c.user) return;
    const userId = c.user.userId;
    const next = new Set(this.inviting());
    next.add(userId);
    this.inviting.set(next);
    this.inviteError.set(null);
    this.api.inviteToProject(this.projectId, userId).subscribe({
      next: () => {
        this.clearInviting(userId);
        this.invitedUserIds.set(new Set(this.invitedUserIds()).add(userId));
        this.showToast('Invite sent');
        this.load();
      },
      error: (e) => {
        this.clearInviting(userId);
        this.inviteError.set(e?.error?.message || 'Could not send invite.');
      },
    });
  }

  private clearInviting(userId: string) {
    const next = new Set(this.inviting());
    next.delete(userId);
    this.inviting.set(next);
  }

  removeMember(m: ProjectMember) {
    this.api.removeProjectMember(this.projectId, m.userId).subscribe({
      next: () => { this.showToast('Removed'); this.load(); },
      error: () => this.showToast('Could not remove — try again'),
    });
  }

  leave() {
    this.api.leaveProject(this.projectId).subscribe({
      next: () => this.router.navigate(['/projects']),
      error: () => this.showToast('Could not leave — try again'),
    });
  }

  deleteProject() {
    this.confirmDeleteOpen.set(false);
    this.api.deleteProject(this.projectId).subscribe({
      next: () => this.router.navigate(['/projects']),
      error: () => this.showToast('Could not delete — try again'),
    });
  }

  private showToast(msg: string) {
    this.toast.set(msg);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 2600);
  }
}
