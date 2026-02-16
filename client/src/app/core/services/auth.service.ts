import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';

interface AuthStatus {
  authEnabled: boolean;
  authenticated: boolean;
}

interface LoginResponse {
  success: boolean;
  token: string;
  expiresIn: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'tjpmm_auth_token';
  private authenticated$ = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Check if we have a stored token on init
    this.authenticated$.next(!!this.getToken());
  }

  get isAuthenticated(): Observable<boolean> {
    return this.authenticated$.asObservable();
  }

  get isAuthenticatedSync(): boolean {
    return this.authenticated$.value;
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Check auth status with server
   */
  async checkStatus(): Promise<AuthStatus> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return firstValueFrom(
      this.http.get<AuthStatus>('/api/auth/status', { headers })
    );
  }

  /**
   * Login with credentials
   */
  async login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>('/api/auth/login', { username, password })
      );
      if (response.success && response.token) {
        localStorage.setItem(this.TOKEN_KEY, response.token);
        this.authenticated$.next(true);
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (error: any) {
      const message = error?.error?.error?.message || 'Login failed';
      return { success: false, error: message };
    }
  }

  /**
   * Sign out — clear token and redirect to login
   */
  signOut(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.authenticated$.next(false);
    this.router.navigate(['/login']);
  }

  /**
   * Handle 401 from interceptor
   */
  handleUnauthorized(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.authenticated$.next(false);
    // Only redirect if not already on login page
    if (!this.router.url.startsWith('/login')) {
      this.router.navigate(['/login']);
    }
  }
}
