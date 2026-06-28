import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private readonly defaultLocalHost = '192.168.1.171';

  apiBaseUrl(): string {
    if (environment.production && environment.apiBaseUrl) {
      return environment.apiBaseUrl;
    }

    const host = window.location.hostname;

    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:8080/api';
    }

    if (this.isLanHost(host)) {
      return `http://${host}:8080/api`;
    }

    return environment.apiBaseUrl || 'https://caca-tournament-backend.onrender.com/api';
  }

  publicFrontendBaseUrl(): string {
    if (environment.production) {
      return 'https://caca-tournament.vercel.app';
    }

    const override = (localStorage.getItem('cacaScoringHostOverride') || '').trim();
    const host = override || this.defaultLocalHost;
    return `http://${host}:4200`;
  }

  isLocalTesting(): boolean {
    return !environment.production;
  }

  defaultLanHost(): string {
    return this.defaultLocalHost;
  }

  private isLanHost(host: string): boolean {
    return /^192\.168\./.test(host) || /^10\./.test(host) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host);
  }
}
