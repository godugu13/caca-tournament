import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { Registration, Tournament } from '../../models/models';

@Component({ selector: 'app-registrations', standalone: true, imports: [FormsModule, NgFor, NgIf, CurrencyPipe], template: `
<h2>Register For Tournament</h2>

<div class="payment-note compact-payment-note">
  <span class="warning-line">Payment required to confirm registration.</span>
  <span>Base Fee: <b>{{ selectedTournament?.registrationFee || 0 | currency:'USD':'symbol':'1.0-2' }}</b></span>
  <span *ngIf="selectedTournament?.totalNumberOfPlayers">Spots Left: <b>{{spotsLeft()}}</b> / {{selectedTournament?.totalNumberOfPlayers}}</span>
  <span>Final Fee: <b>{{finalFee() | currency:'USD':'symbol':'1.0-2'}}</b></span>
  <span>Zelle: <b>cacafunds&#64;gmail.com</b></span>
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

    <div class="field-group"><label>Full Name <span class="required">*</span></label><input [(ngModel)]="model.playerName" placeholder="Full Name"></div>
    <div class="field-group"><label>Phone</label><input [(ngModel)]="model.phone" placeholder="Phone"></div>
    <div class="field-group" *ngIf="showPartnerColumn()"><label>Partner Name <span class="required">*</span></label><input [(ngModel)]="model.partnerName" placeholder="Partner Name"></div>


    <div class="discount-registration-box" *ngIf="enabledDiscounts().length">
      <h3>Discount / Eligibility</h3>
      <p class="muted">Optional. Select discount only if applicable. Discount will be deducted from final fee.</p>

      <div class="field-group">
        <label>Discount Type</label>
        <select [(ngModel)]="model.discountType" (change)="onDiscountChange()">
          <option value="">No Discount</option>
          <option *ngFor="let d of enabledDiscounts()" [value]="d.type">{{d.label}} - {{d.amount || 0 | currency:'USD':'symbol':'1.0-2'}}</option>
        </select>
      </div>

      <div class="field-group" *ngIf="selectedDiscountRequiresName()">
        <label>Eligible Name</label>
        <select [(ngModel)]="model.discountName">
          <option value="">Select Name</option>
          <option *ngFor="let n of selectedDiscountNames()" [value]="n">{{n}}</option>
        </select>
      </div>

      <div class="field-group" *ngIf="model.discountType === 'WOMEN'">
        <label>Gender</label>
        <select [(ngModel)]="model.gender">
          <option value="">Select</option>
          <option value="Women">Women</option>
          <option value="Men">Men</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div class="fee-summary">
        <span>Base Fee: {{selectedTournament?.registrationFee || 0 | currency:'USD':'symbol':'1.0-2'}}</span>
        <span>Discount: -{{discountAmount() | currency:'USD':'symbol':'1.0-2'}}</span>
        <b>Final Fee: {{finalFee() | currency:'USD':'symbol':'1.0-2'}}</b>
      </div>
    </div>

    <div class="field-group">
      <label>Payment Status</label>
      <select [(ngModel)]="model.paymentStatus"><option value="PENDING">Pending</option><option value="PAID">Paid</option></select>
    </div>

    <div class="register-actions"><button (click)="register()">Register</button></div>
  </div>
</div>

<div class="card registration-message-card" *ngIf="registrationSuccessMessage || registrationErrorMessage">
  <p class="ok" *ngIf="registrationSuccessMessage">{{registrationSuccessMessage}}</p>
  <p class="warning" *ngIf="registrationErrorMessage">{{registrationErrorMessage}}</p>
</div>

<h3>Excel Upload / Download</h3>
<div class="card excel-tools-card">
  <div class="excel-tools-row">
    <input type="file" accept=".csv,.xls,.xlsx" (change)="onRosterFileSelected($event)">
    <button type="button" class="secondary" (click)="downloadPlayersCsv()">Download Registered Players CSV</button>
    <button type="button" class="secondary" (click)="downloadStandingsCsv()">Download Standings CSV</button>
  </div>
  <small class="muted">CSV upload columns: Full Name, Email, Phone, Partner Name. For Singles, Partner Name can be blank.</small>
</div>

<h3>Players View</h3>
<div class="card bulk-remove-card" *ngIf="players.length">
  <div class="bulk-remove-row">
    <label class="select-all-label"><input type="checkbox" [checked]="allVisibleSelected()" (change)="toggleAllVisible($event)"> Select All Visible</label>
    <input class="pin-input-short" type="password" maxlength="4" inputmode="numeric" [(ngModel)]="bulkRemovePin" placeholder="Admin PIN">
    <button type="button" class="danger remove-selected-btn" [disabled]="selectedCount() === 0" (click)="removeSelectedPlayers()">Remove Selected Players ({{selectedCount()}})</button>
  </div>
  <small class="muted">Enter Admin PIN once, select multiple players, and remove them together.</small>
</div>

<div class="table-scroll players-table-scroll">
<table class="players-table">
<thead><tr><th class="select-col">Select</th><th class="serial-col">#</th><th>Player</th><th>Format</th><th *ngIf="showPartnerColumn()">Partner</th><th>Email</th><th>Phone</th><th>Final Fee</th><th>Payment</th><th>Action</th></tr></thead>
<tbody>
<tr *ngFor="let p of players; let i=index">
<td class="select-col"><input type="checkbox" [checked]="isSelected(p)" (change)="togglePlayerSelection(p, $event)"></td>
<td class="serial-col">{{i + 1}}</td>
<td>{{displayPlayerName(p)}}</td>
<td>{{p.format || model.format || '-'}}</td>
<td *ngIf="showPartnerColumn()">{{p.partnerName || '-'}}</td>
<td>{{displayEmail(p)}}</td>
<td>{{displayPhone(p)}}</td>
<td>{{p.finalFee || 0 | currency:'USD':'symbol':'1.0-2'}}</td>
<td><span *ngIf="p.paymentStatus === 'PAID'" class="payment-paid">✓ Paid</span><span *ngIf="p.paymentStatus !== 'PAID'" class="payment-pending">✗ Pending</span></td>
<td><button *ngIf="p.paymentStatus !== 'PAID'" type="button" class="small" (click)="updatePayment(p, 'PAID')">Mark Paid</button>
<button *ngIf="p.paymentStatus === 'PAID'" type="button" class="secondary small" (click)="updatePayment(p, 'PENDING')">Mark Pending</button>
<button type="button" class="danger small" (click)="removeSinglePlayer(p)">Remove</button></td>
</tr>
</tbody>
</table>
</div>
` })
export class RegistrationsComponent implements OnInit {
  registrationSuccessMessage = '';
  registrationErrorMessage = '';

  tournaments:Tournament[]=[]; players:Registration[]=[]; teamSize=4; memberMessage='';
  availableFormats:string[] = ['Singles'];
  selectedTournament?: Tournament;
  selectedPlayerIds: {[id: string]: boolean} = {};
  bulkRemovePin = '';
  showPaymentModal = false;
  lastRegistered?: Registration;
  lastRegisteredName = '';
  lastPaymentStatus = 'PENDING';
  model:Registration={tournamentId:'',playerName:'',format:'Singles',paymentStatus:'PENDING', teamMemberNames:[], discountType:'', discountAmount:0, finalFee:0};
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
    if(!this.model.tournamentId) { this.players = []; this.selectedPlayerIds = {}; return; }
    this.api.registrations(this.model.tournamentId).subscribe(p=>{
      const allPlayers = p || [];
      const selectedFormat = this.model.format || '';
      this.players = selectedFormat ? allPlayers.filter((r:any) => !r.format || r.format === selectedFormat) : allPlayers;
      this.selectedPlayerIds = {};
    });
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

  spotsLeft(): number {
    const total = Number(this.selectedTournament?.totalNumberOfPlayers || 0);
    if (!total) return 0;
    return Math.max(0, total - (this.players || []).length);
  }


  enabledDiscounts(): any[] {
    return ((this.selectedTournament as any)?.discountOptions || [])
      .filter((d:any) => d.enabled && Number(d.amount || 0) > 0);
  }

  selectedDiscount(): any {
    return this.enabledDiscounts().find((d:any) => d.type === this.model.discountType);
  }

  selectedDiscountNames(): string[] {
    return this.selectedDiscount()?.eligibleNames || [];
  }

  selectedDiscountRequiresName(): boolean {
    return ['EC_TEAM', 'PRESIDENT_PANEL', 'LIFETIME_MEMBER'].includes(this.model.discountType || '');
  }

  onDiscountChange() {
    this.model.discountName = '';
    this.model.gender = '';
  }

  discountAmount(): number {
    const selected:any = this.selectedDiscount();
    if (!selected) return 0;
    if (this.selectedDiscountRequiresName() && !this.model.discountName) return 0;
    if (this.model.discountType === 'WOMEN' && this.model.gender !== 'Women') return 0;
    return Number(selected.amount || 0);
  }

  finalFee(): number {
    const base = Number(this.selectedTournament?.registrationFee || 0);
    return Math.max(0, base - this.discountAmount());
  }

  register(){
    this.registrationSuccessMessage = '';
    this.registrationErrorMessage = '';
    if (!this.model.tournamentId) { this.registrationErrorMessage = 'Please select a tournament before registering.'; return; }
    if (!this.model.format) { this.registrationErrorMessage = 'Please select a format before registering.'; return; }
    if (!this.model.email || !this.model.playerName) { this.registrationErrorMessage = 'Please enter required Email and Full Name.'; return; }
    if (!this.showPartnerColumn()) this.model.partnerName = '';
    this.model.paymentStatus = this.model.paymentStatus || 'PENDING';
    const payload: Registration = {...this.model,
      tournamentId: this.model.tournamentId,
      playerName: this.model.playerName,
      email: this.model.email,
      phone: this.model.phone,
      partnerName: this.model.partnerName,
      format: this.model.format,
      paymentStatus: this.model.paymentStatus,
      discountType: this.model.discountType || '',
      discountLabel: this.selectedDiscount()?.label || '',
      discountName: this.model.discountName || '',
      gender: this.model.gender || '',
      discountAmount: this.discountAmount(),
      finalFee: this.finalFee()
    };
    this.api.register(payload).subscribe({
      next: (saved) => {
        const savedName = this.displayPlayerName(saved);
        this.registrationSuccessMessage = `${savedName} registered successfully.`;
        const tid = this.model.tournamentId, fmt = this.model.format;
        this.model = {tournamentId: tid, playerName: '', email: '', phone: '', partnerName: '', format: fmt, paymentStatus: 'PENDING', teamMemberNames: [], discountType:'', discountAmount:0, finalFee:0};
        this.memberMessage = '';
        this.loadPlayers();
      },
      error: err => this.registrationErrorMessage = err?.error?.message || err?.error || 'Registration failed. Please check required fields.'
    });
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



  displayPlayerName(p: any): string {
    return p?.playerName || p?.name || p?.fullName || p?.memberName || '-';
  }

  displayEmail(p: any): string {
    return p?.email || p?.playerEmail || p?.memberEmail || '-';
  }

  displayPhone(p: any): string {
    return p?.phone || p?.phoneNumber || p?.mobile || p?.memberPhone || '-';
  }

  onRosterFileSelected(event: any) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    if (!this.model.tournamentId || !this.model.format) {
      alert('Please select tournament and format before uploading players.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const rows = String(reader.result || '').split(/\r?\n/).map(r => r.trim()).filter(r => r);
      if (!rows.length) return;
      const dataRows = rows[0].toLowerCase().includes('name') ? rows.slice(1) : rows;
      let completed = 0;
      let created = 0;
      dataRows.forEach(row => {
        const cols = row.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const payload: Registration = {
          tournamentId: this.model.tournamentId,
          format: this.model.format,
          playerName: cols[0] || '',
          email: cols[1] || '',
          phone: cols[2] || '',
          partnerName: this.showPartnerColumn() ? (cols[3] || '') : '',
          paymentStatus: 'PENDING',
          teamMemberNames: []
        };
        if (!payload.playerName || !payload.email) {
          completed++;
          return;
        }
        this.api.register(payload).subscribe({
          next: () => {
            created++;
            completed++;
            if (completed === dataRows.length) {
              this.registrationSuccessMessage = `${created} player(s) uploaded successfully.`;
              this.loadPlayers();
            }
          },
          error: () => {
            completed++;
            if (completed === dataRows.length) {
              this.registrationSuccessMessage = `${created} player(s) uploaded successfully. Some rows failed.`;
              this.loadPlayers();
            }
          }
        });
      });
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  downloadPlayersCsv() {
    const headers = this.showPartnerColumn()
      ? ['#','Player','Format','Partner','Email','Phone','Payment']
      : ['#','Player','Format','Email','Phone','Payment'];
    const rows = (this.players || []).map((p:any, idx:number) => {
      if (this.showPartnerColumn()) {
        return [idx + 1, this.displayPlayerName(p), p.format || this.model.format || '', p.partnerName || '', this.displayEmail(p), this.displayPhone(p), p.paymentStatus || 'PENDING'];
      }
      return [idx + 1, this.displayPlayerName(p), p.format || this.model.format || '', this.displayEmail(p), this.displayPhone(p), p.paymentStatus || 'PENDING'];
    });
    this.downloadCsv('registered-players.csv', headers, rows);
  }

  downloadStandingsCsv() {
    if (!this.model.tournamentId || !this.model.format) {
      alert('Please select tournament and format first.');
      return;
    }
    this.api.standings(this.model.tournamentId, this.model.format).subscribe((standings:any[]) => {
      const headers = ['Rank','Player/Team','Wins','PF','PA','Point Diff'];
      const rows = (standings || []).map((s:any, idx:number) => [
        idx + 1,
        s.playerName || s.teamName || s.name || '',
        s.wins ?? 0,
        s.pointsFor ?? s.pf ?? 0,
        s.pointsAgainst ?? s.pa ?? 0,
        s.pointDiff ?? s.pd ?? 0
      ]);
      this.downloadCsv('standings.csv', headers, rows);
    });
  }

  downloadCsv(filename: string, headers: any[], rows: any[][]) {
    const escape = (v:any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  showPartnerColumn(): boolean { return this.model?.format === 'Doubles' || this.model?.format === 'Mixed Doubles'; }

  partnerDisplay(r: any): string {
    return this.showPartnerColumn() ? (r.partnerName || '-') : '';
  }


}
