import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminAccessService } from '../../services/admin-access.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [FormsModule, NgIf],
  template: `
<div class="card admin-login-card">
  <h2>Admin Access</h2>
  <p class="muted">Enter your organization tournament Admin PIN. You will only see tournaments created with that PIN.</p>
  <label>Admin PIN</label>
  <input type="password" inputmode="numeric" [(ngModel)]="pin" placeholder="Enter admin PIN" (keyup.enter)="login()">
  <button type="button" class="primary" (click)="login()">Unlock Admin Pages</button>
  <p class="warning" *ngIf="message">{{message}}</p>
</div>`
})
export class AdminLoginComponent {
  pin = '';
  message = '';
  constructor(private admin: AdminAccessService, private router: Router, private route: ActivatedRoute) {}
  login() {
    if (this.admin.login(this.pin)) {
      this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') || '/gameday');
    } else {
      this.message = 'Enter a valid 4-digit Admin PIN';
    }
  }
}
