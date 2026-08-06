import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { AdminAccessService } from '../../services/admin-access.service';
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

      <div class="field-group format-checkbox-group"><label>Format(s) <span class="required">*</span></label><label class="inline-check" *ngFor="let f of availableFormats"><input type="checkbox" [checked]="selectedFormats.includes(f)" (change)="toggleRegistrationFormat(f,$event)"> {{f}}</label></div>

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

  <ng-container *ngIf="isAdmin()">
  <h3>Registration Import / Export</h3>
  <div class="card upload-card registration-transfer-card">
    <div class="registration-transfer-grid">
      <div>
        <label>Upload registered players</label>
        <input type="file" accept=".txt,.csv,.xls,.xlsx" (change)="onRosterFileSelected($event)" [disabled]="rosterUploadInProgress">
      </div>
      <div>
        <label>Tournament Admin PIN</label>
        <input type="password" inputmode="numeric" maxlength="4" [(ngModel)]="rosterUploadPin" placeholder="4-digit PIN">
      </div>
    </div>
    <p class="muted">Supported files: TXT, CSV, XLS and XLSX. Reusable columns: Player, Format, Partner, Email, Phone, Final Fee and Payment.</p>
    <p class="warning" *ngIf="rosterUploadInProgress">Uploading and validating registrations…</p>
    <div class="download-row">
      <button type="button" class="secondary" (click)="downloadPlayersXlsx(false)" [disabled]="!model.tournamentId">Download Current Format XLSX</button>
      <button type="button" class="secondary" (click)="downloadPlayersXlsx(true)" [disabled]="!model.tournamentId">Download All Formats XLSX</button>
      <button type="button" class="secondary" (click)="downloadPlayersCsv()">Download Current View CSV</button>
      <button type="button" class="secondary" (click)="downloadStandingsCsv()">Download Standings CSV</button>
    </div>
    <small class="muted">The downloaded XLSX can be uploaded into another tournament. Select the new tournament and enter its admin PIN before uploading.</small>
  </div>
  </ng-container>

  <h3>Players View</h3>
  <div class="card bulk-remove-card">
    <label><input type="checkbox" [checked]="allVisibleSelected()" (change)="toggleAllVisible($event)"> Select All Visible</label>
    <button type="button" class="danger" (click)="openDeletePinModal()">Remove Selected Players ({{selectedCount()}})</button>
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
<div class="modal-backdrop" *ngIf="deletePinModalOpen"><div class="delete-pin-modal"><h3>Admin PIN</h3><input type="password" inputmode="numeric" maxlength="4" [(ngModel)]="bulkRemovePin" placeholder="4-digit PIN"><div class="modal-actions"><button type="button" class="danger" (click)="confirmDeleteWithPin()">Confirm Delete</button><button type="button" class="secondary" (click)="deletePinModalOpen=false">Cancel</button></div><p class="warning" *ngIf="deletePinError">{{deletePinError}}</p></div></div>
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
  selectedFormats: string[] = [];
  deletePinModalOpen = false;
  deletePinError = '';
  memberMessage = '';
  registrationSuccessMessage = '';
  registrationErrorMessage = '';
  rosterUploadPin = '';
  rosterUploadInProgress = false;

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

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router,
    private adminAccess: AdminAccessService) {}


  isAdmin(): boolean {
    return sessionStorage.getItem('cacaAdminUnlocked') === 'true'
      && this.adminAccess.isAdmin();
  }

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

  toggleRegistrationFormat(format:string,event:any){ const checked=!!event?.target?.checked; this.selectedFormats=checked?Array.from(new Set([...this.selectedFormats,format])):this.selectedFormats.filter(f=>f!==format); this.model.format=this.selectedFormats[0]||''; }
  openDeletePinModal(){ if(!this.selectedCount()){alert('Please select at least one player.');return;} this.bulkRemovePin='';this.deletePinError='';this.deletePinModalOpen=true; }
  confirmDeleteWithPin(){ if(!this.bulkRemovePin){this.deletePinError='Enter Admin PIN';return;} this.removeSelectedPlayers(); }

  onTournamentChange() {
    this.selectedTournament = this.tournaments.find(t => t.id === this.model.tournamentId);
    this.normalizeSelectedTournamentDiscounts();
    this.availableFormats = this.selectedTournament?.formats?.length
      ? this.selectedTournament.formats
      : [this.selectedTournament?.tournamentType || 'Singles'];
    this.model.format = this.availableFormats[0] || 'Singles';
    this.selectedFormats = [this.model.format];
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
    this.api.registrations(this.model.tournamentId).subscribe(players => {
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
    if (!this.selectedFormats.length) { this.registrationErrorMessage = 'Please select at least one format.'; return; }
    if (!this.model.email || !this.model.playerName) { this.registrationErrorMessage = 'Please enter required Email and Full Name.'; return; }
    if (this.selectedFormats.some(f => f === 'Doubles' || f === 'Mixed Doubles') && !this.model.partnerName) { this.registrationErrorMessage = 'Please enter Partner Name.'; return; }

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

    const requests = this.selectedFormats.map(fmt => this.api.register({...payload, format: fmt, partnerName: (fmt === 'Doubles' || fmt === 'Mixed Doubles') ? this.model.partnerName : ''}));
    forkJoin(requests).subscribe({
      next: savedList => {
        const saved = savedList[0];
        this.registrationSuccessMessage = `${this.displayPlayerName(saved)} registered successfully for ${this.selectedFormats.join(', ')}.`;
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
    return this.selectedFormats.some(f => f === 'Doubles' || f === 'Mixed Doubles');
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
    if (!this.isAdmin()) {
      this.registrationErrorMessage = 'Admin login is required for registration import/export.';
      return;
    }

    const file: File | undefined = event?.target?.files?.[0];
    if (!file) return;
    const input = event.target;
    this.registrationSuccessMessage = '';
    this.registrationErrorMessage = '';

    if (!this.model.tournamentId) {
      this.registrationErrorMessage = 'Please select a tournament before uploading registrations.';
      input.value = '';
      return;
    }
    if (!this.model.format) {
      this.registrationErrorMessage = 'Please select a format before uploading registrations.';
      input.value = '';
      return;
    }
    if (!this.rosterUploadPin.trim()) {
      this.registrationErrorMessage = 'Please enter the tournament Admin PIN before uploading.';
      input.value = '';
      return;
    }

    const extension = (file.name.split('.').pop() || '').toLowerCase();
    if (!['txt', 'csv', 'xls', 'xlsx'].includes(extension)) {
      this.registrationErrorMessage = 'Supported files are .txt, .csv, .xls and .xlsx.';
      input.value = '';
      return;
    }

    this.rosterUploadInProgress = true;
    this.api.uploadRoster(this.model.tournamentId, this.model.format, this.rosterUploadPin.trim(), file).subscribe({
      next: (result:any) => {
        const uploaded = Number(result?.uploaded || 0);
        const duplicates = Number(result?.duplicatesSkipped || 0);
        const blanks = Number(result?.blankRowsSkipped || 0);
        const errors: string[] = result?.errors || [];
        const notes = [
          duplicates ? `${duplicates} duplicate(s) skipped` : '',
          blanks ? `${blanks} blank row(s) skipped` : '',
          errors.length ? `${errors.length} row error(s)` : ''
        ].filter(Boolean);
        this.registrationSuccessMessage = `${uploaded} registration(s) imported successfully${notes.length ? `. ${notes.join(', ')}.` : '.'}`;
        if (errors.length) this.registrationErrorMessage = errors.slice(0, 5).join(' | ');
        this.rosterUploadInProgress = false;
        input.value = '';
        this.loadPlayers();
      },
      error: err => {
        this.rosterUploadInProgress = false;
        input.value = '';
        this.registrationErrorMessage = this.displayError(err);
      }
    });
  }

  downloadPlayersXlsx(allFormats:boolean) {
    if (!this.model.tournamentId) {
      this.registrationErrorMessage = 'Please select a tournament first.';
      return;
    }
    const format = allFormats ? '' : (this.model.format || '');
    this.api.exportRegisteredPlayers(this.model.tournamentId, format).subscribe({
      next: blob => {
        const tournament = (this.selectedTournament?.name || 'tournament').replace(/[^A-Za-z0-9._-]+/g, '-');
        const suffix = allFormats ? 'all-formats' : (format || 'current-format').replace(/[^A-Za-z0-9._-]+/g, '-');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${tournament}-registered-players-${suffix}.xlsx`;
        link.click();
        URL.revokeObjectURL(link.href);
      },
      error: err => this.registrationErrorMessage = this.displayError(err)
    });
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
    if (!this.isAdmin()) {
      this.registrationErrorMessage = 'Admin login is required for registration import/export.';
      return;
    }

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
    if (!this.isAdmin()) {
      this.registrationErrorMessage = 'Admin login is required for registration import/export.';
      return;
    }

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
    this.openDeletePinModal();
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
      next: () => { this.selectedPlayerIds = {}; this.deletePinModalOpen=false; this.bulkRemovePin=''; this.loadPlayers(); },
      error: err => { this.deletePinError=this.displayError(err); }
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
