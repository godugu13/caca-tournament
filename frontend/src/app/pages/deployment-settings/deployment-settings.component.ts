import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-deployment-settings',
  standalone: true,
  imports: [FormsModule, NgIf],
  template: `
<h2>Deployment Settings</h2>
<div class="card form">
  <p class="muted">Use this during public beta if frontend and backend are hosted on different URLs.</p>

  <label>Backend API Base URL</label>
  <input [(ngModel)]="apiBaseUrl" placeholder="https://your-backend.up.railway.app/api">

  <div class="action-row">
    <button type="button" class="primary" (click)="save()">Save API URL</button>
    <button type="button" class="secondary" (click)="clear()">Clear</button>
  </div>

  <p class="ok" *ngIf="message">{{message}}</p>
</div>
`
})
export class DeploymentSettingsComponent {
  apiBaseUrl = localStorage.getItem('cacaApiBaseUrl') || '';
  message = '';

  save() {
    if (!this.apiBaseUrl.trim()) return;
    localStorage.setItem('cacaApiBaseUrl', this.apiBaseUrl.trim().replace(/\/$/, ''));
    this.message = 'Saved. Refreshing application...';
    setTimeout(() => location.reload(), 800);
  }

  clear() {
    localStorage.removeItem('cacaApiBaseUrl');
    this.apiBaseUrl = '';
    this.message = 'Cleared. Refreshing application...';
    setTimeout(() => location.reload(), 800);
  }
}
