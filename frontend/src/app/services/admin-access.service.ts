import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AdminAccessService {
  private readonly storageKey = 'cacaAdminUnlocked';
  private readonly pinKey = 'cacaAdminPin';
  private readonly adminPin = '1123';

  constructor(private router: Router) {}

  isAdmin(): boolean {
    return sessionStorage.getItem(this.storageKey) === 'true';
  }

  isSuperAdmin(): boolean {
    return this.currentPin() === this.adminPin;
  }

  currentPin(): string {
    return sessionStorage.getItem(this.pinKey) || '';
  }

  login(pin: string): boolean {
    const normalized = (pin || '').replace(/[^0-9]/g, '').slice(0, 4);
    if (normalized.length === 4) {
      sessionStorage.setItem(this.storageKey, 'true');
      sessionStorage.setItem(this.pinKey, normalized);

      // Clear any older localStorage admin session from previous builds.
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.pinKey);
      return true;
    }
    return false;
  }

  logout(): void {
    sessionStorage.removeItem(this.storageKey);
    sessionStorage.removeItem(this.pinKey);

    // Clear older localStorage session too, so admin is not auto-logged-in after new deployments.
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.pinKey);

    this.router.navigate(['/']);
  }
}
