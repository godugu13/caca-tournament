import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { Registration, Tournament } from '../../models/models';

@Component({ selector: 'app-registrations', standalone: true, imports: [FormsModule, NgFor, NgIf, CurrencyPipe], template: `
<h2>Register For Tournament</h2>

<div class="payment-note">
  <span class="warning-line">*************** Without payment, Registration is not Valid *****************</span>
  <p>Please complete the registration using Zelle.</p>
  <p>Fee: <b>{{ selectedTournament?.registrationFee || 0 | currency:'USD':'symbol':'1.0-2' }}</b></p>
  <p>Zelle: <b>cacafunds&#64;gmail.com</b></p>
</div>

<div class="card register-card">
  <div class="register-form-grid">
    <div class="field-group">
      <label>Select Tournament <span class="required">*</span></label>
      <select [(ngModel)]="model.tournamentId" (change)="onTournamentChange()">
        <option value="">Select Tournament</option>
        <option *ngFor="let t of tournaments" [value]="t.id">{{t.name}}</option>
      </select>
    </div>

    <div class="field-group">
      <label>Format <span class="required">*</span></label>
      <select [(ngModel)]="model.format" (change)="onFormatChange()">
        <option *ngFor="let f of availableFormats" [value]="f">{{f}}</option>
      </select>
    </div>

    <div class="field-group email-field">
      <label>Email <span class="required">*</span></label>
      <div class="inline-row">
        <input [(ngModel)]="model.email" placeholder="Email" (blur)="lookupMemberByEmail()">
        <button type="button" class="secondary lookup-btn" (click)="lookupMemberByEmail()">Lookup</button>
      </div>
      <small class="muted">Existing member details will auto-fill. You can still edit them.</small>
      <span *ngIf="memberMessage" class="ok">{{memberMessage}}</span>
    </div>

    <div class="field-group">
      <label>Full Name <span class="required">*</span></label>
      <input [(ngModel)]="model.playerName" placeholder="Full Name">
    </div>

    <div class="field-group">
      <label>Phone</label>
      <input [(ngModel)]="model.phone" placeholder="Phone">
    </div>

    <div class="field-group" *ngIf="showPartnerColumn()">
      <label>Partner Name <span class="required">*</span></label>
      <input [(ngModel)]="model.partnerName" placeholder="Partner Name">
    </div>

    <div *ngIf="model.format === 'Team Event'" class="team-box team-event-register">
      <label>Number of Team Members</label>
      <input [(ngModel)]="teamSize" type="number" min="1" (ngModelChange)="resizeTeamMembers()">
      <label>Team Members</label>
      <input *ngFor="let p of model.teamMemberNames; let i=index" [(ngModel)]="model.teamMemberNames![i]" placeholder="Team member {{i+1}}">
    </div>

    <div class="field-group">
      <label>Payment Status</label>
      <select [(ngModel)]="model.paymentStatus">
        <option value="PENDING">Pending</option>
        <option value="PAID">Paid</option>
      </select>
    </div>

    <div class="register-actions">
      <button (click)="register()">Register</button>
    </div>
  </div>
</div>

<h3>Players View</h3>

<div class="card bulk-remove-card" *ngIf="players.length">
  <div class="bulk-remove-row">
    <label class="select-all-label">
      <input type="checkbox" [checked]="allVisibleSelected()" (change)="toggleAllVisible($event)">
      Select All Visible
    </label>

    <input class="pin-input-short" type="password" maxlength="4" inputmode="numeric"
           [(ngModel)]="bulkRemovePin" placeholder="Admin PIN">

    <button type="button" class="danger remove-selected-btn"
            [disabled]="selectedCount() === 0"
            (click)="removeSelectedPlayers()">
      Remove Selected Players ({{selectedCount()}})
    </button>
  </div>
  <small class="muted">Enter Admin PIN once, select multiple players, and remove them together.</small>
</div>

<div class="table-scroll players-table-scroll">
  <table class="players-table">
    <thead>
      <tr>
        <th class="select-col">Select</th>
        <th class="serial-col">#</th>
        <th>Player</th>
        <th>Format</th>
        <th *ngIf="showPartnerColumn()">Partner</th>
        <th>Email</th>
        <th>Phone</th>
        <th>Payment</th>
        <th>Action</th>
      </tr>
    </thead>

    <tbody>
      <tr *ngFor="let p of players; let i=index">
        <td class="select-col">
          <input type="checkbox" [checked]="isSelected(p)" (change)="togglePlayerSelection(p, $event)">
        </td>
        <td class="serial-col">{{i + 1}}</td>
        <td>{{displayPlayerName(p)}}</td>
        <td>{{p.format || model.format || '-'}}</td>
        <td *ngIf="showPartnerColumn()">{{p.partnerName || '-'}}</td>
        <td>{{p.email || '-'}}</td>
        <td>{{p.phone || '-'}}</td>
        <td>
          <span *ngIf="p.paymentStatus === 'PAID'" class="payment-paid">✓ Paid</span>
          <span *ngIf="p.paymentStatus !== 'PAID'" class="payment-pending">✗ Pending</span>
        </td>
        <td>
          <button *ngIf="p.paymentStatus !== 'PAID'" type="button" class="small" (click)="updatePayment(p, 'PAID')">Mark Paid</button>
          <button *ngIf="p.paymentStatus === 'PAID'" type="button" class="secondary small" (click)="updatePayment(p, 'PENDING')">Mark Pending</button>
          <button type="button" class="danger small" (click)="removeSinglePlayer(p)">Remove</button>
        </td>
      </tr>
    </tbody>
  </table>
</div>

<div class="modal-backdrop" *ngIf="showPaymentModal">
  <div class="modal-card">
    <h3>Registration Saved</h3>
    <p><b>{{lastRegisteredName}}</b> is registered.</p>
    <div class="payment-note">
      <span class="warning-line">*************** Without payment, Registration is not Valid *****************</span>
      <p>Please complete the registration using Zelle.</p>
      <p>Fee: <b>{{ selectedTournament?.registrationFee || 0 | currency:'USD':'symbol':'1.0-2' }}</b></p>
      <p>Zelle: <b>cacafunds&#64;gmail.com</b></p>
      <p>Status: <b [class.payment-paid]="lastPaymentStatus === 'PAID'" [class.payment-pending]="lastPaymentStatus !== 'PAID'">{{lastPaymentStatus === 'PAID' ? 'Paid' : 'Pending'}}</b></p>
    </div>
    <div class="modal-actions">
      <button type="button" (click)="markLastPaid()" *ngIf="lastPaymentStatus !== 'PAID'">Mark Paid</button>
      <button type="button" class="secondary" (click)="showPaymentModal=false">Close</button>
    </div>
  </div>
</div>` })
export class RegistrationsComponent implements OnInit {
  tournaments:Tournament[]=[]; players:Registration[]=[]; teamSize=4; memberMessage='';
  availableFormats:string[] = ['Singles'];
  selectedTournament?: Tournament;
  selectedPlayerIds: {[id: string]: boolean} = {};
  bulkRemovePin = '';
  showPaymentModal = false;
  lastRegistered?: Registration;
  lastRegisteredName = '';
  lastPaymentStatus = 'PENDING';
  model:Registration={tournamentId:'',playerName:'',format:'Singles',paymentStatus:'PENDING', teamMemberNames:[]};
  constructor(private api:ApiService){}
  ngOnInit(){this.api.tournaments().subscribe(t=>this.tournaments=t)}

  onTournamentChange(){
    this.selectedTournament = this.tournaments.find(t => t.id === this.model.tournamentId);
    this.availableFormats = this.selectedTournament?.formats?.length ? this.selectedTournament.formats : [this.selectedTournament?.tournamentType || 'Singles'];
    this.model.format = this.availableFormats[0] || 'Singles';
    this.memberMessage='';
    this.loadPlayers();
  }
  loadPlayers(){
    if(this.model.tournamentId && this.model.format) {
      this.api.registrationsByFormat(this.model.tournamentId, this.model.format).subscribe(p=>{this.players=p || []; this.selectedPlayerIds={};});
    } else if(this.model.tournamentId) {
      this.api.registrations(this.model.tournamentId).subscribe(p=>{this.players=p || []; this.selectedPlayerIds={};});
    }
  }

  onFormatChange(){
    this.resizeTeamMembers();
    this.loadPlayers();
  }

  resizeTeamMembers(){ if(this.model.format === 'Team Event') this.model.teamMemberNames = Array.from({length:Number(this.teamSize || 0)}, (_,i)=> this.model.teamMemberNames?.[i] || ''); else this.model.teamMemberNames=[]; }
  lookupMemberByEmail(){
    this.memberMessage='';
    const email = (this.model.email || '').trim();
    if(!email) return;
    this.api.memberByEmail(email).subscribe(member=>{
      if(member){
        this.model.playerName = member.name || this.model.playerName;
        this.model.email = member.email || this.model.email;
        this.model.phone = member.phone || this.model.phone;
        this.memberMessage = `Found existing member ${member.name}. Details auto-filled; you can edit if needed.`;
      } else {
        this.memberMessage = 'No existing member found for this email. New member record will be created.';
      }
    });
  }
  register(){
    if (!this.showPartnerColumn()) this.model.partnerName = '';
    this.model.paymentStatus = this.model.paymentStatus || 'PENDING';
    this.api.register(this.model).subscribe((saved)=>{
      this.lastRegistered = saved;
      this.lastRegisteredName = saved.playerName;
      this.lastPaymentStatus = saved.paymentStatus || 'PENDING';
      this.showPaymentModal = true;
      const tid=this.model.tournamentId;
      const fmt=this.model.format;
      this.model={tournamentId:tid,playerName:'',format:fmt,paymentStatus:'PENDING', teamMemberNames:[]};
      this.memberMessage = '';
      this.loadPlayers();
    })
  }
  updatePayment(p:Registration, status:string){
    if(!p.id) return;
    this.api.updatePaymentStatus(p.id, status).subscribe(()=>this.loadPlayers());
  }
  markLastPaid(){
    if(!this.lastRegistered?.id) return;
    this.api.updatePaymentStatus(this.lastRegistered.id, 'PAID').subscribe((updated)=>{
      this.lastPaymentStatus = updated.paymentStatus || 'PAID';
      this.loadPlayers();
    });
  }


  isSelected(p: Registration): boolean {
    return !!(p.id && this.selectedPlayerIds[p.id]);
  }

  togglePlayerSelection(p: Registration, event: any) {
    if (!p.id) return;
    this.selectedPlayerIds[p.id] = !!event?.target?.checked;
  }

  allVisibleSelected(): boolean {
    const visible = (this.players || []).filter(p => !!p.id);
    return visible.length > 0 && visible.every(p => !!this.selectedPlayerIds[p.id!]);
  }

  toggleAllVisible(event: any) {
    const checked = !!event?.target?.checked;
    (this.players || []).forEach(p => {
      if (p.id) this.selectedPlayerIds[p.id] = checked;
    });
  }

  selectedIds(): string[] {
    return Object.keys(this.selectedPlayerIds || {}).filter(id => this.selectedPlayerIds[id]);
  }

  selectedCount(): number {
    return this.selectedIds().length;
  }

  removeSinglePlayer(p: Registration) {
    if (!p.id) return;
    this.selectedPlayerIds = {[p.id]: true};
    this.removeSelectedPlayers();
  }

  removeSelectedPlayers() {
    const ids = this.selectedIds();
    if (!ids.length) {
      alert('Please select at least one player to remove.');
      return;
    }
    const pin = (this.bulkRemovePin || '').trim();
    if (!pin) {
      alert('Please enter Admin PIN once, then remove selected players.');
      return;
    }
    if (!confirm(`Remove ${ids.length} selected player(s)?`)) return;
    this.api.deleteRegistrationsBulk(ids, pin).subscribe({
      next: () => {
        this.selectedPlayerIds = {};
        this.loadPlayers();
      },
      error: err => alert(err?.error?.message || err?.error || 'Unable to remove selected players')
    });
  }

  showPartnerColumn(): boolean {
    return this.model?.format === 'Doubles' || this.model?.format === 'Mixed Doubles';
  }

  partnerDisplay(r: any): string {
    return this.showPartnerColumn() ? (r.partnerName || '-') : '';
  }


}
