import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ProjectInvite, ProjectSummary } from '../../core/models';
import { BottomNavComponent } from '../../shared/bottom-nav.component';
import { TopBarComponent } from '../../shared/top-bar.component';

// Team projects hub — list the projects you're an active member of, respond to
// pending invites, and create a new project.
@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BottomNavComponent, TopBarComponent],
  template: `
    <app-top-bar></app-top-bar>

    <div class="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto w-full px-4 md:px-6 lg:px-8 pt-6 md:pt-8 lg:pt-10 pb-24 md:pb-10">
      <div class="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <a routerLink="/dashboard" class="text-body-sm text-slate-400 hover:text-white mb-1 inline-block">← Today</a>
          <h1 class="text-display md:text-display-lg gradient-text">Team Projects</h1>
        </div>
        <button class="btn-primary text-sm !py-2 shrink-0" (click)="creatorOpen.set(true)">+ New</button>
      </div>

      @if (loading()) {
        <div class="py-20 flex justify-center"><div class="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin"></div></div>
      } @else {
        @if (invites().length) {
          <section class="mb-6 animate-fade-up">
            <h2 class="text-micro uppercase tracking-wider text-accent-soft mb-2">Invited to join</h2>
            @for (inv of invites(); track inv.project.projectId) {
              <div class="rounded-2xl p-4 mb-2 flex items-center justify-between glass">
                <div class="min-w-0">
                  <p class="text-white font-semibold truncate">{{ inv.project.name }}</p>
                  @if (inv.project.description) { <p class="text-caption text-slate-400 truncate">{{ inv.project.description }}</p> }
                </div>
                <div class="flex gap-2 shrink-0">
                  <button class="btn-ghost text-caption !py-1.5 !px-3" (click)="respond(inv, false)">Decline</button>
                  <button class="btn-primary text-caption !py-1.5 !px-3" (click)="respond(inv, true)">Join</button>
                </div>
              </div>
            }
          </section>
        }

        @if (projects().length === 0) {
          <div class="glass p-8 text-center animate-fade-up">
            <p class="text-4xl mb-3">👥</p>
            <p class="text-white font-semibold mb-1">No team projects yet</p>
            <p class="text-body-sm text-slate-400 mb-4">Create a project, invite your <a routerLink="/network" class="text-accent-soft underline">connections</a>, and set shared goals together.</p>
            <button class="btn-primary text-sm !py-2" (click)="creatorOpen.set(true)">Create your first project</button>
          </div>
        } @else {
          <section class="animate-fade-up">
            @for (p of projects(); track p.projectId) {
              <a [routerLink]="['/project', p.projectId]" class="rounded-2xl p-4 mb-2.5 flex items-center justify-between glass hover:border-accent/30 border border-transparent transition-all block">
                <div class="min-w-0">
                  <p class="text-white font-semibold truncate">{{ p.name }}</p>
                  @if (p.description) { <p class="text-caption text-slate-400 truncate">{{ p.description }}</p> }
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="text-caption text-slate-400">{{ p.memberCount }} member{{ p.memberCount === 1 ? '' : 's' }}</span>
                  <span class="text-micro uppercase px-2 py-0.5 rounded-full border border-white/10 text-slate-300">{{ p.myRole }}</span>
                </div>
              </a>
            }
          </section>
        }
      }
    </div>

    @if (creatorOpen()) {
      <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" (click)="creatorOpen.set(false)">
        <div class="glass-strong w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <h2 class="text-heading text-white font-bold mb-4">New project</h2>

          <label class="label">Name</label>
          <input class="input mb-3" [(ngModel)]="name" placeholder="e.g. Launch Q3 roadmap" />

          <label class="label">Description <span class="text-slate-500">(optional)</span></label>
          <textarea class="input resize-none mb-3" rows="3" [(ngModel)]="description" placeholder="What's this project about?"></textarea>

          @if (createError()) { <p class="text-flame text-caption mb-3">{{ createError() }}</p> }

          <div class="flex gap-2 justify-end">
            <button class="btn-ghost text-sm !py-2" (click)="creatorOpen.set(false)">Cancel</button>
            <button class="btn-primary text-sm !py-2" (click)="create()" [disabled]="creating() || !name.trim()">
              {{ creating() ? 'Creating…' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (toast(); as msg) {
      <div class="fixed bottom-28 md:bottom-8 inset-x-0 flex justify-center z-50 px-4 pointer-events-none">
        <div class="glass-strong px-4 py-2.5 rounded-full text-body-sm text-white animate-fade-up">{{ msg }}</div>
      </div>
    }

    <app-bottom-nav></app-bottom-nav>
  `,
})
export class ProjectsComponent implements OnInit {
  loading = signal(true);
  projects = signal<ProjectSummary[]>([]);
  invites = signal<ProjectInvite[]>([]);

  creatorOpen = signal(false);
  creating = signal(false);
  createError = signal<string | null>(null);
  name = '';
  description = '';

  toast = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.listProjects().subscribe({
      next: (r) => {
        this.projects.set(r.projects || []);
        this.invites.set(r.invites || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  create() {
    const title = this.name.trim();
    if (!title || this.creating()) return;
    this.creating.set(true);
    this.createError.set(null);
    this.api.createProject(title, this.description.trim() || undefined).subscribe({
      next: (r) => {
        this.creating.set(false);
        this.creatorOpen.set(false);
        this.router.navigate(['/project', r.project.projectId]);
      },
      error: (e) => {
        this.creating.set(false);
        this.createError.set(e?.error?.message || 'Something went wrong.');
      },
    });
  }

  respond(inv: ProjectInvite, accept: boolean) {
    this.api.respondProjectInvite(inv.project.projectId, accept).subscribe({
      next: () => {
        this.showToast(accept ? 'Joined' : 'Declined');
        this.load();
      },
      error: () => this.showToast('Something went wrong — try again'),
    });
  }

  private showToast(msg: string) {
    this.toast.set(msg);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 2600);
  }
}
