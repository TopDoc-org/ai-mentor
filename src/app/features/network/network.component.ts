import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ConnectionRow, ConnectionsView, ConnectionUser } from '../../core/models';
import { BottomNavComponent } from '../../shared/bottom-nav.component';
import { TopBarComponent } from '../../shared/top-bar.component';

// LinkedIn-style connection graph. Three sections (accepted / incoming /
// outgoing) plus a search box to find people by name/email and send a request.
@Component({
  selector: 'app-network',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BottomNavComponent, TopBarComponent],
  template: `
    <app-top-bar></app-top-bar>

    <div class="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto w-full px-4 md:px-6 lg:px-8 pt-6 md:pt-8 lg:pt-10 pb-24 md:pb-10">
      <div class="mb-4 md:mb-6">
        <a routerLink="/dashboard" class="text-body-sm text-slate-400 hover:text-white mb-1 inline-block">← Today</a>
        <h1 class="text-display md:text-display-lg gradient-text">My Network</h1>
        <p class="text-body-sm text-slate-400 mt-1">Connect with your team so you can invite them into shared projects.</p>
      </div>

      <!-- Search / send request -->
      <div class="glass p-4 mb-6 animate-fade-up">
        <label class="label">Find someone</label>
        <div class="flex gap-2">
          <input class="input flex-1" [(ngModel)]="query" (keydown.enter)="search()" placeholder="Name or email" />
          <button class="btn-primary text-sm !py-2 shrink-0" (click)="search()" [disabled]="searching()">
            {{ searching() ? '…' : 'Search' }}
          </button>
        </div>
        @if (searchError()) { <p class="text-flame text-caption mt-2">{{ searchError() }}</p> }
        @if (results().length) {
          <div class="mt-3 space-y-2">
            @for (u of results(); track u.userId) {
              <div class="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2">
                <div class="min-w-0">
                  <p class="text-white text-body-sm font-semibold truncate">{{ u.name }}</p>
                  <p class="text-caption text-slate-400 truncate">{{ u.email }}</p>
                </div>
                <button class="btn-primary text-caption !py-1.5 !px-3 shrink-0" (click)="sendRequest(u)" [disabled]="sending().has(u.userId)">
                  {{ sending().has(u.userId) ? '…' : 'Connect' }}
                </button>
              </div>
            }
          </div>
        }
      </div>

      @if (loading()) {
        <div class="py-20 flex justify-center"><div class="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin"></div></div>
      } @else {
        @if (view().incoming.length) {
          <section class="mb-6 animate-fade-up">
            <h2 class="text-micro uppercase tracking-wider text-accent-soft mb-2">Requests received</h2>
            @for (r of view().incoming; track r.connectionId) {
              <div class="rounded-2xl p-4 mb-2 flex items-center justify-between glass">
                <div class="min-w-0">
                  <p class="text-white font-semibold truncate">{{ r.user?.name }}</p>
                  <p class="text-caption text-slate-400 truncate">{{ r.user?.email }}</p>
                </div>
                <div class="flex gap-2 shrink-0">
                  <button class="btn-ghost text-caption !py-1.5 !px-3" (click)="decline(r)">Decline</button>
                  <button class="btn-primary text-caption !py-1.5 !px-3" (click)="accept(r)">Accept</button>
                </div>
              </div>
            }
          </section>
        }

        @if (view().outgoing.length) {
          <section class="mb-6 animate-fade-up">
            <h2 class="text-micro uppercase tracking-wider text-slate-400 mb-2">Requests sent</h2>
            @for (r of view().outgoing; track r.connectionId) {
              <div class="rounded-2xl p-4 mb-2 flex items-center justify-between glass">
                <div class="min-w-0">
                  <p class="text-white font-semibold truncate">{{ r.user?.name }}</p>
                  <p class="text-caption text-slate-400 truncate">{{ r.user?.email }}</p>
                </div>
                <span class="text-caption text-slate-400 shrink-0">Pending</span>
              </div>
            }
          </section>
        }

        <section class="animate-fade-up">
          <h2 class="text-micro uppercase tracking-wider text-slate-400 mb-2">Connections</h2>
          @if (view().accepted.length === 0) {
            <div class="glass p-8 text-center">
              <p class="text-4xl mb-3">🤝</p>
              <p class="text-white font-semibold mb-1">No connections yet</p>
              <p class="text-body-sm text-slate-400">Search for a teammate above and send a request.</p>
            </div>
          } @else {
            @for (r of view().accepted; track r.connectionId) {
              <div class="rounded-2xl p-4 mb-2 flex items-center justify-between glass">
                <div class="min-w-0">
                  <p class="text-white font-semibold truncate">{{ r.user?.name }}</p>
                  <p class="text-caption text-slate-400 truncate">{{ r.user?.email }}</p>
                </div>
                <button class="text-caption text-slate-400 hover:text-red-400 shrink-0" (click)="remove(r)">Remove</button>
              </div>
            }
          }
        </section>
      }
    </div>

    @if (toast(); as msg) {
      <div class="fixed bottom-28 md:bottom-8 inset-x-0 flex justify-center z-50 px-4 pointer-events-none">
        <div class="glass-strong px-4 py-2.5 rounded-full text-body-sm text-white animate-fade-up">{{ msg }}</div>
      </div>
    }

    <app-bottom-nav></app-bottom-nav>
  `,
})
export class NetworkComponent implements OnInit {
  loading = signal(true);
  view = signal<ConnectionsView>({ accepted: [], incoming: [], outgoing: [] });

  query = '';
  searching = signal(false);
  searchError = signal<string | null>(null);
  results = signal<ConnectionUser[]>([]);
  sending = signal<Set<string>>(new Set());

  toast = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.listConnections().subscribe({
      next: (v) => {
        this.view.set(v);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  search() {
    const q = this.query.trim();
    this.searchError.set(null);
    if (q.length < 2) {
      this.searchError.set('Type at least 2 characters.');
      return;
    }
    this.searching.set(true);
    this.api.searchUsers(q).subscribe({
      next: (r) => {
        this.results.set(r.users || []);
        this.searching.set(false);
      },
      error: (e) => {
        this.searching.set(false);
        this.searchError.set(e?.error?.message || 'Search failed.');
      },
    });
  }

  sendRequest(u: ConnectionUser) {
    const next = new Set(this.sending());
    next.add(u.userId);
    this.sending.set(next);
    this.api.sendConnectionRequest(u.email).subscribe({
      next: () => {
        this.results.set(this.results().filter((x) => x.userId !== u.userId));
        this.clearSending(u.userId);
        this.showToast('Request sent');
        this.load();
      },
      error: (e) => {
        this.clearSending(u.userId);
        this.showToast(e?.error?.message || 'Could not send request.');
      },
    });
  }

  private clearSending(userId: string) {
    const next = new Set(this.sending());
    next.delete(userId);
    this.sending.set(next);
  }

  accept(r: ConnectionRow) {
    this.api.acceptConnection(r.connectionId).subscribe({
      next: () => { this.showToast('Connected'); this.load(); },
      error: () => this.showToast('Could not accept — try again'),
    });
  }

  decline(r: ConnectionRow) {
    this.api.declineConnection(r.connectionId).subscribe({
      next: () => { this.showToast('Declined'); this.load(); },
      error: () => this.showToast('Could not decline — try again'),
    });
  }

  remove(r: ConnectionRow) {
    this.api.removeConnection(r.connectionId).subscribe({
      next: () => { this.showToast('Removed'); this.load(); },
      error: () => this.showToast('Could not remove — try again'),
    });
  }

  private showToast(msg: string) {
    this.toast.set(msg);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 2600);
  }
}
