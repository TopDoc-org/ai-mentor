import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE } from './api-config';
import { AuthResponse, ZenamazeUser } from './models';
import { isBrowser } from './platform';
import { AnalyticsService } from './analytics.service';
import { AnalyticsEvent } from './analytics-events';

const TOKEN_KEY = 'zenamaze_token';
const USER_KEY = 'zenamaze_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _token = signal<string | null>(isBrowser ? localStorage.getItem(TOKEN_KEY) : null);
  private _user = signal<ZenamazeUser | null>(this.readUser());

  readonly user = this._user.asReadonly();
  readonly isAuthed = computed(() => !!this._token());

  private analytics = inject(AnalyticsService);

  constructor(private http: HttpClient) {}

  get token(): string | null {
    return this._token();
  }

  register(
    data: { name?: string; email: string; phone: string; password: string; roastLevel?: string },
    claimGoalId?: string
  ): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_BASE}/auth/register`, { ...data, claimGoalId })
      .pipe(tap((r) => {
        this.persist(r);
        this.analytics.logEvent(AnalyticsEvent.SignUp, { method: 'password' });
        if (claimGoalId) this.analytics.logEvent(AnalyticsEvent.GuestConvert);
      }));
  }

  login(identifier: string, password: string, claimGoalId?: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_BASE}/auth/login`, { identifier, password, claimGoalId })
      .pipe(tap((r) => {
        this.persist(r);
        this.analytics.logEvent(AnalyticsEvent.Login, { method: 'password' });
        if (claimGoalId) this.analytics.logEvent(AnalyticsEvent.GuestConvert);
      }));
  }

  logout(): void {
    if (isBrowser) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    this._token.set(null);
    this._user.set(null);
    this.analytics.logEvent(AnalyticsEvent.Logout);
    this.analytics.setUser(null);
  }

  // Merge fresh fields into the cached user (e.g. after changing language) so the
  // whole app sees the update without a re-login.
  setUser(user: ZenamazeUser): void {
    if (isBrowser) localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._user.set(user);
  }

  private persist(r: AuthResponse): void {
    if (isBrowser) {
      localStorage.setItem(TOKEN_KEY, r.token);
      localStorage.setItem(USER_KEY, JSON.stringify(r.user));
    }
    this._token.set(r.token);
    this._user.set(r.user);
  }

  private readUser(): ZenamazeUser | null {
    if (!isBrowser) return null;
    const raw = localStorage.getItem(USER_KEY);
    try {
      return raw ? (JSON.parse(raw) as ZenamazeUser) : null;
    } catch {
      return null;
    }
  }
}
