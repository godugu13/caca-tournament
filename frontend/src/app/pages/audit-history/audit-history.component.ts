import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { AdminAccessService } from '../../services/admin-access.service';
import { Tournament } from '../../models/models';

@Component({
  selector: 'app-audit-history',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf, DatePipe],
  template: `
<h2>Score Audit History</h2>
<div class="card form">
  <label>Tournament</label>
  <select [(ngModel)]="tournamentId">
    <option value="">Select Tournament</option>
    <option *ngFor="let t of tournaments" [value]="t.id">{{t.name}}</option>
  </select>
  <label>Format</label>
  <select [(ngModel)]="format">
    <option>Singles</option><option>Doubles</option><option>Mixed Doubles</option><option>Team Event</option>
  </select>
  <button type="button" class="primary" (click)="load()">Load Audit History</button>
</div>
<div class="card" *ngIf="audits.length">
  <div class="table-scroll audit-table-scroll">
  <table>
    <thead><tr><th>Time</th><th>Round</th><th>Board</th><th>Updated By</th><th>Action</th><th>IP</th><th>Device</th><th>Location</th><th>Score</th><th>Finalized</th></tr></thead>
    <tbody>
      <tr *ngFor="let a of audits">
        <td>{{a.createdAt | date:'short'}}</td><td>{{a.roundType}} {{a.roundNumber}}</td><td>{{a.boardNumber}}</td>
        <td>{{a.updatedByRole}} {{a.updatedByPhone ? '(' + a.updatedByPhone + ')' : ''}}</td>
        <td>{{a.actionType || '-'}}</td>
        <td>{{a.ipAddress || '-'}}</td>
        <td>{{a.deviceInfo || '-'}} / {{a.browser || '-'}}</td>
        <td>{{a.geoLocation || (a.latitude && a.longitude ? (a.latitude + ',' + a.longitude) : '-')}}</td>
        <td><b>{{a.player1Score}}</b> - <b>{{a.player2Score}}</b></td><td>{{a.finalized ? 'Yes' : 'No'}}</td>
      </tr>
    </tbody>
  </table>
  </div>
</div>
<div class="card" *ngIf="loaded && !audits.length"><p class="muted">No audit records found.</p></div>`
})
export class AuditHistoryComponent {
  tournaments: Tournament[] = [];
  tournamentId = '';
  format = 'Singles';
  audits: any[] = [];
  loaded = false;
  constructor(private api: ApiService, private admin: AdminAccessService) { this.api.tournamentsByPin(this.admin.currentPin()).subscribe(t => this.tournaments = t || []); }
  load() {
    if (!this.tournamentId || !this.format) return;
    this.api.auditHistory(this.tournamentId, this.format).subscribe(data => { this.audits = data || []; this.loaded = true; });
  }
}
