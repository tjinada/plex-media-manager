import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  try {
    const status = await authService.checkStatus();

    // Auth not enabled on server — allow access
    if (!status.authEnabled) {
      return true;
    }

    // Auth enabled and user is authenticated
    if (status.authenticated) {
      return true;
    }

    // Not authenticated — redirect to login
    return router.createUrlTree(['/login']);
  } catch {
    // Server error — if we have a token, let interceptor handle 401s
    if (authService.getToken()) {
      return true;
    }
    return router.createUrlTree(['/login']);
  }
};
