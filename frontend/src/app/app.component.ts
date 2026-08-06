import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AdminAccessService } from './services/admin-access.service';
import { ApiService } from './services/api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, NgIf],
  template: `
    <header class="topbar">
      <div class="brand single-brand">
        <div class="logo-box">
          <b>CACA 3.0™</b>
          <span>Tournament Management System</span>
          <small>Let’s Play Together</small>
        </div>
      </div>
      <nav>
        <a routerLink="/">Dashboard</a>
        <a routerLink="/registrations">Register For</a>
        <a routerLink="/player-score">Player Score</a>
        <a routerLink="/brackets">Brackets</a>
        <a routerLink="/standings">Standings</a>
        <ng-container *ngIf="isAdmin()">
          <a routerLink="/tournaments">Add Tournament</a>
          <a routerLink="/gameday">Game Day</a>
          <a routerLink="/scores">Scores</a>
          <a routerLink="/audit-history">Audit History</a>
          <a routerLink="/deployment-settings">Deployment</a>
          <button type="button" class="nav-btn" (click)="logout()">Admin Logout</button>
        </ng-container>
        <a *ngIf="!isAdmin()" routerLink="/admin-login">Admin Login</a>
      </nav>
    </header>
    <main><router-outlet /></main><footer class="app-footer">© CACA 3.0 owners. All rights reserved.</footer>`
})
export class AppComponent {
  constructor(private admin: AdminAccessService, private api: ApiService) {
    this.clearLegacyAdminLocalStorage();
    this.startKeepAlive();
  }

  private clearLegacyAdminLocalStorage(): void {
    if (sessionStorage.getItem('cacaAdminUnlocked') !== 'true') {
      localStorage.removeItem('cacaAdminUnlocked');
      localStorage.removeItem('cacaAdminPin');
    }
  }
  isAdmin(): boolean { return this.admin.isAdmin(); }
  logout(): void { this.admin.logout(); }
  private startKeepAlive(): void { this.api.ping().subscribe({error:()=>{}}); window.setInterval(()=>this.api.ping().subscribe({error:()=>{}}),60000); }

}
