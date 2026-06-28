import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Tournament, Registration } from '../../models/models';

@Component({
  selector: 'app-registrations',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf, CurrencyPipe],
  template: `
<section class="registration-page">
  <h2>Register For Tournament</h2>

  <div class="card registration-card">

    <div class="tournament-schedule-display" *ngIf="selectedTournament">
      <b>Tournament Schedule</b>
      <span>{{selectedTournamentSchedule()}}</span>
      <span *ngIf="selectedTournamentTime()">Time: {{selectedTournamentTime()}}</span>
      <span *ngIf="selectedTournament.address">Venue: {{selectedTournament.address}}</span>
    </div>

    <div class="payment-note compact-payment-note">
      <span class="warning-line">Payment required to confirm registration.</span>
      <span>Base Fee: <b>{{ selectedTournament?.registrationFee || 0 | currency:'USD':'symbol':'1.0-2' }}</b></span>
      <span *ngIf="selectedTournament?.totalNumberOfPlayers">Spots Left: <b>{{spotsLeft()}}</b> / {{selectedTournament?.totalNumberOfPlayers}}</span>
      <span>Final Fee: <b>{{finalFee() | currency:'USD':'symbol':'1.0-2'}}</b></span>
      <span>Zelle: <b>cacafunds&#64;gmail.com</b></span>
    </div>

    <div class="form-grid">
      <div class="field-group">
        <label>Tournament <span class="required">*</span></label>
        <select [(ngModel)]="model.tournamentId" (change)="onTournamentChange()">
          <option value="">Select Tournament</option>
          <option *ngFor="let t of tournaments" [value]="t.id">{{t.name}}</option>
        </select>
      </div>

      <div class="field-group">
        <label>Format <span class="required">*</span></label>
        <select *ngIf="availableFormats.length > 1" [(ngModel)]="model.format" (change)="onFormatChange()">
          <option *ngFor="let f of availableFormats" [value]="f">{{f}}</option>
        </select>
        <input *ngIf="availableFormats.length <= 1" [ngModel]="model.format" disabled>
      </div>

      <div class="field-group email-lookup">
        <label>Email <span class="required">*</span></label>
        <input [(ngModel)]="model.email" placeholder="Email">
        <button type="button" class="secondary" (click)="lookupMember()">Lookup</button>
        <small>Existing member details will auto-fill. You can still edit them.</small>
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
          <select [(ngModel)]="model.discountName" (change)="updatePaymentByFinalFee()">
            <option value="">Select Name</option>
            <option *ngFor="let n of selectedDiscountNames()" [value]="n">{{n}}</option>
          </select>
        </div>

        <div class="field-group" *ngIf="model.discountType === 'WOMEN'">
          <label>Gender</label>
          <select [(ngModel)]="model.gender" (change)="updatePaymentByFinalFee()">
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
        <select [(ngModel)]="model.paymentStatus">
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
        </select>
      </div>
    </div>

    <p class="ok" *ngIf="memberMessage">{{memberMessage}}</p>
    <p class="ok" *ngIf="registrationSuccessMessage">{{registrationSuccessMessage}}</p>
    <p class="warning" *ngIf="registrationErrorMessage">{{registrationErrorMessage}}</p>

    <div class="center-actions">
      <button type="button" (click)="register()">Register</button>
    </div>
  </div>

  <h3>Excel Upload / Download</h3>
  <div class="card upload-card">
    <input type="file" accept=".csv,.txt" (change)="onRosterFileSelected($event)">
    <div class="download-row">
      <button type="button" class="secondary" (click)="downloadPlayersCsv()">Download Registered Players CSV</button>
      <button type="button" class="secondary" (click)="downloadStandingsCsv()">Download Standings CSV</button>
    </div>
    <small class="muted">CSV upload columns accepted: #, Player, Format, Email, Phone, Payment, Partner.</small>
  </div>

  <h3>Players View</h3>
  <div class="card bulk-remove-card">
    <label><input type="checkbox" [checked]="allVisibleSelected()" (change)="toggleAllVisible($event)"> Select All Visible</label>
    <input [(ngModel)]="bulkRemovePin" placeholder="Admin PIN">
    <button type="button" class="danger" (click)="removeSelectedPlayers()">Remove Selected Players ({{selectedCount()}})</button>
    <small>Enter Admin PIN once, select multiple players, and remove them together.</small>
  </div>

  <div class="table-scroll">
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
          <th>Final Fee</th>
          <th>Payment</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let p of players; let i=index">
          <td><input type="checkbox" [checked]="isSelected(p)" (change)="togglePlayerSelection(p, $event)"></td>
          <td>{{i+1}}</td>
          <td>{{displayPlayerName(p)}}</td>
          <td>{{p.format || model.format}}</td>
          <td *ngIf="showPartnerColumn()">{{partnerDisplay(p)}}</td>
          <td>{{displayEmail(p)}}</td>
          <td>{{displayPhone(p)}}</td>
          <td>{{p.finalFee || 0 | currency:'USD':'symbol':'1.0-2'}}</td>
          <td>
            <span [class.ok]="(p.paymentStatus || '').toUpperCase()==='PAID'" [class.warning]="(p.paymentStatus || '').toUpperCase()!=='PAID'">
              {{(p.paymentStatus || 'PENDING').toUpperCase()==='PAID' ? '✓ Paid' : '✗ Pending'}}
            </span>
          </td>
          <td>
            <button type="button" class="secondary small" (click)="togglePayment(p)">{{(p.paymentStatus || '').toUpperCase()==='PAID' ? 'Mark Pending' : 'Mark Paid'}}</button>
            <button type="button" class="danger small" (click)="removeSinglePlayer(p)">Remove</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</section>
`
})
export class RegistrationsComponent implements OnInit {
  tournaments: Tournament[] = [];
  selectedTournament?: Tournament;
  availableFormats: string[] = ['Singles'];
  players: Registration[] = [];
  selectedPlayerIds: {[id: string]: boolean} = {};
  bulkRemovePin = '';
  memberMessage = '';
  registrationSuccessMessage = '';
  registrationErrorMessage = '';

  model: Registration = {
    tournamentId: '',
    playerName: '',
    email: '',
    phone: '',
    format: 'Singles',
    paymentStatus: 'PENDING',
    teamMemberNames: [],
    discountType: '',
    discountAmount: 0,
    finalFee: 0
  };

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.api.tournaments().subscribe(tournaments => {
      this.tournaments = tournaments || [];
      const queryTournamentId = this.route.snapshot.queryParamMap.get('tournamentId') || '';
      const queryFormat = this.route.snapshot.queryParamMap.get('format') || '';
      if (queryTournamentId) {
        this.model.tournamentId = queryTournamentId;
        this.onTournamentChange();
        if (queryFormat) {
          this.model.format = queryFormat;
          this.onFormatChange();
        }
      }
    });
  }


  selectedTournamentSchedule(): string {
    if (!this.selectedTournament) return '';
    const start = this.selectedTournament.tournamentDate || '';
    const end = this.selectedTournament.tournamentEndDate || '';
    if (start && end && start !== end) return `${start} to ${end}`;
    return start || end || 'Date not set';
  }

  selectedTournamentTime(): string {
    if (!this.selectedTournament) return '';
    const start = this.formatTime(this.selectedTournament.tournamentStartTime || '');
    const end = this.formatTime(this.selectedTournament.tournamentEndTime || '');
    if (start && end) return `${start} - ${end}`;
    return start || end || '';
  }

  formatTime(value: string): string {
    if (!value) return '';
    const parts = value.split(':');
    const hour = Number(parts[0] || 0);
    const minute = parts[1] || '00';
    if (Number.isNaN(hour)) return value;
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${minute} ${suffix}`;
  }

  onTournamentChange() {
    this.selectedTournament = this.tournaments.find(t => t.id === this.model.tournamentId);
    this.normalizeSelectedTournamentDiscounts();
    this.availableFormats = this.selectedTournament?.formats?.length
      ? this.selectedTournament.formats
      : [this.selectedTournament?.tournamentType || 'Singles'];
    this.model.format = this.availableFormats[0] || 'Singles';
    this.model.discountType = '';
    this.model.discountName = '';
    this.model.gender = '';
    this.updatePaymentByFinalFee();
    this.memberMessage = '';
    this.loadPlayers();
  }

  onFormatChange() {
    if (!this.showPartnerColumn()) this.model.partnerName = '';
    this.loadPlayers();
  }

  loadPlayers() {
    if (!this.model.tournamentId || !this.model.format) {
      this.players = [];
      return;
    }
    this.api.registrationsByFormat(this.model.tournamentId, this.model.format).subscribe(players => {
      this.players = (players || []).map(p => this.normalizeRegistrationForDisplay(p));
      this.selectedPlayerIds = {};
    });
  }

  lookupMember() {
    this.memberMessage = '';
    if (!this.model.email) return;
    this.api.memberByEmail(this.model.email).subscribe({
      next: member => {
        if (member) {
          this.model.playerName = member.name || this.model.playerName;
          this.model.phone = member.phone || this.model.phone;
          this.model.email = member.email || this.model.email;
          this.memberMessage = `Found existing member ${member.name}. Details auto-filled; you can edit if needed.`;
        }
      },
      error: () => this.memberMessage = ''
    });
  }

  register() {
    this.registrationSuccessMessage = '';
    this.registrationErrorMessage = '';

    if (!this.model.tournamentId) { this.registrationErrorMessage = 'Please select a tournament before registering.'; return; }
    if (!this.model.format) { this.registrationErrorMessage = 'Please select a format before registering.'; return; }
    if (!this.model.email || !this.model.playerName) { this.registrationErrorMessage = 'Please enter required Email and Full Name.'; return; }
    if (this.showPartnerColumn() && !this.model.partnerName) { this.registrationErrorMessage = 'Please enter Partner Name.'; return; }

    this.updatePaymentByFinalFee();

    const payload: Registration = {
      ...this.model,
      tournamentId: this.model.tournamentId,
      format: this.model.format,
      playerName: this.model.playerName,
      email: this.model.email,
      phone: this.model.phone,
      partnerName: this.showPartnerColumn() ? this.model.partnerName : '',
      paymentStatus: this.finalFee() <= 0 ? 'PAID' : (this.model.paymentStatus || 'PENDING'),
      discountType: this.model.discountType || '',
      discountLabel: this.selectedDiscount()?.label || '',
      discountName: this.model.discountName || '',
      gender: this.model.gender || '',
      discountAmount: this.discountAmount(),
      finalFee: this.finalFee(),
      teamMemberNames: []
    };

    this.api.register(payload).subscribe({
      next: saved => {
        this.registrationSuccessMessage = `${this.displayPlayerName(saved)} registered successfully.`;
        const tid = this.model.tournamentId;
        const fmt = this.model.format;
        this.model = {
          tournamentId: tid,
          playerName: '',
          email: '',
          phone: '',
          partnerName: '',
          format: fmt,
          paymentStatus: this.finalFee() <= 0 ? 'PAID' : 'PENDING',
          teamMemberNames: [],
          discountType: '',
          discountAmount: 0,
          finalFee: 0
        };
        this.loadPlayers();
      },
      error: err => this.registrationErrorMessage = this.displayError(err)
    });
  }

  normalizeSelectedTournamentDiscounts() {
    const discounts:any[] = ((this.selectedTournament as any)?.discountOptions || []);
    discounts.forEach((d:any) => {
      if ((!d.eligibleNames || !d.eligibleNames.length) && d.eligibleNamesText) {
        d.eligibleNames = this.parseDiscountNames(d.eligibleNamesText);
      }
      d.eligibleNames = this.parseDiscountNames((d.eligibleNames || []).join(',') || d.eligibleNamesText || '');
    });
  }

  parseDiscountNames(value:string): string[] {
    return String(value || '').split(/[\n,]+/).map(v => v.trim()).filter(v => v);
  }

  spotsLeft(): number {
    const total = Number(this.selectedTournament?.totalNumberOfPlayers || 0);
    return total ? Math.max(0, total - (this.players || []).length) : 0;
  }

  enabledDiscounts(): any[] {
    return ((this.selectedTournament as any)?.discountOptions || []).filter((d:any) => d.enabled && Number(d.amount || 0) > 0);
  }

  selectedDiscount(): any {
    return this.enabledDiscounts().find((d:any) => d.type === this.model.discountType);
  }

  selectedDiscountNames(): string[] {
    const selected:any = this.selectedDiscount();
    if (!selected) return [];
    return this.parseDiscountNames((selected.eligibleNames || []).join(',') || selected.eligibleNamesText || '');
  }

  selectedDiscountRequiresName(): boolean {
    return ['EC_TEAM', 'PRESIDENT_PANEL', 'LIFETIME_MEMBER'].includes(this.model.discountType || '');
  }

  onDiscountChange() {
    this.model.discountName = '';
    this.model.gender = '';
    this.updatePaymentByFinalFee();
  }

  updatePaymentByFinalFee() {
    this.model.discountAmount = this.discountAmount();
    this.model.finalFee = this.finalFee();
    if (this.model.finalFee <= 0) this.model.paymentStatus = 'PAID';
    else if (!this.model.paymentStatus || this.model.paymentStatus === 'PAID') this.model.paymentStatus = 'PENDING';
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

  showPartnerColumn(): boolean {
    return this.model?.format === 'Doubles' || this.model?.format === 'Mixed Doubles';
  }

  partnerDisplay(r:any): string {
    return r?.partnerName || (r?.teamMemberNames || []).join(' / ') || '-';
  }

  displayPlayerName(p:any): string {
    return p?.playerName || p?.name || p?.fullName || p?.memberName || '-';
  }

  displayEmail(p:any): string {
    return p?.email || p?.playerEmail || p?.memberEmail || '';
  }

  displayPhone(p:any): string {
    return p?.phone || p?.phoneNumber || p?.mobile || '';
  }

  normalizeRegistrationForDisplay(r:any): any {
    const playerName = String(r?.playerName || '').trim();
    const email = String(r?.email || '').trim();
    const phone = String(r?.phone || '').trim();
    const badName = playerName === '#' || /^\d+$/.test(playerName);
    const emailLooksLikeName = !!email && !email.includes('@') && /[A-Za-z]/.test(email);
    const phoneLooksLikeFormat = ['Singles','Doubles','Mixed Doubles','Team Event'].includes(phone);
    if (badName && emailLooksLikeName) {
      return {...r, playerName: email, email: '', format: phoneLooksLikeFormat ? phone : r.format, phone: phoneLooksLikeFormat ? '' : phone};
    }
    return r;
  }

  onRosterFileSelected(event:any) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    if (!this.model.tournamentId || !this.model.format) {
      alert('Please select tournament and format before uploading players.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const rows = this.parseCsv(String(reader.result || '')).filter(r => r.some(c => String(c || '').trim()));
      if (!rows.length) return;

      const first = rows[0].map(c => String(c || '').trim().toLowerCase());
      const hasHeader = first.some(h => ['#','player','full name','name','format','email','phone','payment','partner','partner name'].includes(h));
      const header = hasHeader ? first : [];
      const dataRows = hasHeader ? rows.slice(1) : rows;

      const idx = (names:string[], fallback:number) => {
        for (const n of names) {
          const found = header.indexOf(n.toLowerCase());
          if (found >= 0) return found;
        }
        return fallback;
      };

      const playerIdx = idx(['player','full name','name','player name'], hasHeader ? 1 : 0);
      const formatIdx = idx(['format'], -1);
      const emailIdx = idx(['email','e-mail'], hasHeader ? 3 : 1);
      const phoneIdx = idx(['phone','mobile','phone number'], hasHeader ? 4 : 2);
      const paymentIdx = idx(['payment','payment status','paid'], hasHeader ? 5 : -1);
      const partnerIdx = idx(['partner','partner name'], hasHeader ? -1 : 3);

      let completed = 0;
      let created = 0;
      let skipped = 0;

      dataRows.forEach(row => {
        const name = String(row[playerIdx] || '').trim();
        const fileFormat = formatIdx >= 0 ? String(row[formatIdx] || '').trim() : '';
        const email = String(row[emailIdx] || '').trim();
        const phone = String(row[phoneIdx] || '').trim();
        const paymentRaw = paymentIdx >= 0 ? String(row[paymentIdx] || '').trim().toUpperCase() : '';
        const partner = partnerIdx >= 0 ? String(row[partnerIdx] || '').trim() : '';

        if (!name || name === '#' || name.toLowerCase() === 'player') {
          skipped++;
          completed++;
          return;
        }

        const payload: Registration = {
          tournamentId: this.model.tournamentId,
          format: fileFormat || this.model.format,
          playerName: name,
          email,
          phone,
          partnerName: this.showPartnerColumn() ? partner : '',
          paymentStatus: paymentRaw.includes('PAID') ? 'PAID' : (this.finalFee() <= 0 ? 'PAID' : 'PENDING'),
          teamMemberNames: [],
          finalFee: this.finalFee(),
          discountAmount: 0
        };

        this.api.register(payload).subscribe({
          next: () => { created++; completed++; this.finishUploadIfDone(completed, dataRows.length, created, skipped); },
          error: () => { completed++; this.finishUploadIfDone(completed, dataRows.length, created, skipped); }
        });
      });
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  finishUploadIfDone(completed:number, total:number, created:number, skipped:number) {
    if (completed === total) {
      this.registrationSuccessMessage = `${created} player(s) uploaded successfully${skipped ? `, ${skipped} skipped` : ''}.`;
      this.loadPlayers();
    }
  }

  parseCsv(text:string): string[][] {
    const rows:string[][] = [];
    let current:string[] = [];
    let value = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (ch === '"' && inQuotes && next === '"') {
        value += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        current.push(value);
        value = '';
      } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
        if (ch === '\r' && next === '\n') i++;
        current.push(value);
        rows.push(current);
        current = [];
        value = '';
      } else {
        value += ch;
      }
    }

    current.push(value);
    if (current.length > 1 || current[0]) rows.push(current);
    return rows;
  }

  downloadPlayersCsv() {
    const headers = this.showPartnerColumn()
      ? ['#','Player','Format','Partner','Email','Phone','Final Fee','Payment']
      : ['#','Player','Format','Email','Phone','Final Fee','Payment'];
    const rows = (this.players || []).map((p:any, idx:number) => {
      if (this.showPartnerColumn()) {
        return [idx + 1, this.displayPlayerName(p), p.format || this.model.format || '', p.partnerName || '', this.displayEmail(p), this.displayPhone(p), p.finalFee || 0, p.paymentStatus || 'PENDING'];
      }
      return [idx + 1, this.displayPlayerName(p), p.format || this.model.format || '', this.displayEmail(p), this.displayPhone(p), p.finalFee || 0, p.paymentStatus || 'PENDING'];
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
        s.pointDiff ?? s.pointsDifferential ?? s.pd ?? 0
      ]);
      this.downloadCsv('standings.csv', headers, rows);
    });
  }

  downloadCsv(filename:string, headers:any[], rows:any[][]) {
    const escape = (v:any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  isSelected(p:Registration): boolean {
    return !!(p.id && this.selectedPlayerIds[p.id]);
  }

  togglePlayerSelection(p:Registration, event:any) {
    if (p.id) this.selectedPlayerIds[p.id] = !!event?.target?.checked;
  }

  allVisibleSelected(): boolean {
    const visible = (this.players || []).filter(p => !!p.id);
    return visible.length > 0 && visible.every(p => !!this.selectedPlayerIds[p.id!]);
  }

  toggleAllVisible(event:any) {
    const checked = !!event?.target?.checked;
    (this.players || []).forEach(p => { if (p.id) this.selectedPlayerIds[p.id] = checked; });
  }

  selectedIds(): string[] {
    return Object.keys(this.selectedPlayerIds || {}).filter(id => this.selectedPlayerIds[id]);
  }

  selectedCount(): number {
    return this.selectedIds().length;
  }

  removeSinglePlayer(p:Registration) {
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
      next: () => { this.selectedPlayerIds = {}; this.loadPlayers(); },
      error: err => alert(this.displayError(err))
    });
  }

  togglePayment(p:Registration) {
    if (!p.id) return;
    const status = (p.paymentStatus || '').toUpperCase() === 'PAID' ? 'PENDING' : 'PAID';
    this.api.updatePaymentStatus(p.id, status).subscribe({
      next: () => this.loadPlayers(),
      error: err => alert(this.displayError(err))
    });
  }

  displayError(err:any): string {
    if (!err) return 'Operation failed.';
    if (typeof err === 'string') return err;
    if (typeof err?.error === 'string') return err.error;
    if (err?.error?.message) return err.error.message;
    if (err?.message) return err.message;
    try { return JSON.stringify(err.error || err); } catch { return 'Operation failed.'; }
  }
}
