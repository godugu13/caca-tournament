import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { AdminAccessService } from '../../services/admin-access.service';
import { Tournament } from '../../models/models';

@Component({
  selector: 'app-tournaments',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf],
  template: `
<section class="tournament-page">
  <h2>{{ editMode ? 'Edit Tournament' : 'Add Tournament' }}</h2>

  <div class="card tournament-form-card">
    <div class="tournament-form-grid">
      <div class="field-group name-field">
        <label>Tournament Name <span class="required">*</span></label>
        <input [(ngModel)]="model.name" placeholder="Tournament Name">
      </div>

      <div class="format-section">
        <label>Select Tournament Format(s) <span class="required">*</span></label>
        <small class="muted">Select one or more formats to open registrations for this tournament.</small>

        <label class="format-card" *ngFor="let f of allFormats">
          <input type="checkbox" [checked]="isFormatSelected(f)" (change)="toggleFormat(f, $event)">
          <span class="format-text">
            <b>{{f}}</b>
            <small>{{formatDescription(f)}}</small>
          </span>
        </label>
      </div>

      <div class="field-group date-field" *ngIf="!multiFormatSelected()">
        <label>Tournament Date <span class="required">*</span></label>
        <input [(ngModel)]="model.tournamentDate" type="date">
      </div>

      <div class="field-group date-field" *ngIf="multiFormatSelected()">
        <label>Tournament From Date <span class="required">*</span></label>
        <input [(ngModel)]="model.tournamentDate" type="date">
      </div>

      <div class="field-group date-field" *ngIf="multiFormatSelected()">
        <label>Tournament To Date <span class="required">*</span></label>
        <input [(ngModel)]="model.tournamentEndDate" type="date">
      </div>

      <div class="field-group fee-field">
        <label>Registration Fee ($)</label>
        <input [(ngModel)]="model.registrationFee" type="number" min="0" placeholder="0">
      </div>

      <div class="field-group venue-field">
        <label>Venue Address</label>
        <input [(ngModel)]="model.address" placeholder="Physical tournament address">
      </div>

      <div class="field-group count-field">
        <label>{{ participantCountLabel() }}</label>
        <input [(ngModel)]="model.totalNumberOfPlayers" type="number" min="2">
      </div>

      <div class="field-group srr-field">
        <label># SRR Rounds <span class="required">*</span></label>
        <input [(ngModel)]="model.srrRounds" type="number" min="1" max="7">
        <small class="muted">Admin can edit this later on game day if time constraints require fewer/more SRR rounds.</small>
      </div>

      <div class="field-group ko-field">
        <label># Knockout Rounds</label>
        <input [(ngModel)]="model.knockoutRounds" type="number" min="0">
      </div>

      <div *ngIf="isFormatSelected('Team Event')" class="team-box team-event-field">
        <label>Team Event Players Per Team <span class="required">*</span></label>
        <select [(ngModel)]="model.playersPerTeam" (ngModelChange)="resizeTeamPlayers()">
          <option [ngValue]="3">3 Players</option>
          <option [ngValue]="4">4 Players</option>
          <option [ngValue]="5">5 Players</option>
          <option [ngValue]="6">6 Players</option>
          <option [ngValue]="7">7 Players</option>
          <option [ngValue]="8">8 Players</option>
        </select>

        <label>Team Name</label>
        <input [(ngModel)]="model.teamName" placeholder="Optional Team Name">

        <label>Player Names</label>
        <input *ngFor="let p of model.teamPlayerNames; let i=index" [(ngModel)]="model.teamPlayerNames![i]" placeholder="Player {{i+1}} name optional">
      </div>


      <div class="discount-section">
        <h3>Discount Setup</h3>
        <p class="muted">Select discounts the organizer wants to offer. These will appear on registration page and deduct from final fee.</p>

        <div class="discount-card" *ngFor="let d of model.discountOptions">
          <label class="discount-enable">
            <input type="checkbox" [(ngModel)]="d.enabled">
            <b>{{d.label}}</b>
          </label>
          <input type="number" min="0" [(ngModel)]="d.amount" placeholder="Discount Amount">
          <textarea *ngIf="needsNameList(d.type)" [(ngModel)]="d.eligibleNamesText" placeholder="Enter eligible names separated by comma or new line"></textarea>
          <small class="muted" *ngIf="needsNameList(d.type)">Names entered here show as dropdown during registration.</small>
          <small class="muted" *ngIf="d.type === 'WOMEN'">Registration page will show Gender selection for this discount.</small>
        </div>
      </div>

      <div class="field-group pin-field">
        <label>Organization / Tournament Admin PIN <span class="required">*</span></label>
        <div class="pin-row">
          <input class="pin-input-short" [type]="showAdminPin ? 'text' : 'password'" [(ngModel)]="model.adminPin" placeholder="4-digit PIN" maxlength="4" inputmode="numeric" autocomplete="off">
          <button type="button" class="secondary pin-toggle-btn" (click)="showAdminPin = !showAdminPin">{{ showAdminPin ? 'Hide' : 'Show' }}</button>
        </div>
        <small class="muted">Each organization can create its own 4-digit tournament admin PIN to protect tournament management from unauthorized users.</small>
      </div>

      <div class="field-group description-field-wrap">
        <label class="full-line-label">Description</label>
        <textarea class="description-field" [(ngModel)]="model.description" placeholder="Description"></textarea>
      </div>

      <div class="action-row form-actions">
        <button (click)="save()">{{ editMode ? 'Update Tournament' : 'Create Tournament' }}</button>
        <button type="button" class="secondary" *ngIf="editMode" (click)="cancelEdit()">Cancel Edit</button>
      </div>
    </div>
  </div>
</section>

<h3>Manage Tournament</h3>
<p class="muted">You are viewing tournaments for your current Admin PIN only. Super Admin can view all tournaments.</p>
<div class="table-scroll manage-tournament-scroll">
<table>
  <tr>
    <th>Name</th><th>Formats</th><th>Date</th><th>Fee</th><th>Address</th><th>SRR</th><th>KO</th><th>Status</th><th>Action</th>
  </tr>
  <tr *ngFor="let t of tournaments">
    <td>{{t.name}}</td>
    <td>{{(t.formats || []).join(', ')}}</td>
    <td>{{t.tournamentDate}}<span *ngIf="t.tournamentEndDate"> to {{t.tournamentEndDate}}</span></td>
    <td>{{ currencySymbol }}{{t.registrationFee || 0}}</td>
    <td>{{t.address}}</td>
    <td>{{t.srrRounds}}</td>
    <td>{{t.knockoutRounds}}</td>
    <td>{{t.status}}</td>
    <td>
      <button type="button" class="secondary small" (click)="editTournament(t)">Edit</button>
      <button type="button" class="danger small" (click)="askDelete(t)">Delete</button>
    </td>
  </tr>
</table>
</div>

<div class="card form delete-confirm" *ngIf="pendingDelete">
  <h3>Delete Tournament</h3>
  <p>Enter tournament Admin PIN or Super Admin PIN to delete <b>{{pendingDelete.name}}</b>. This also deletes related registrations and generated matches.</p>
  <label>Admin PIN <span class="required">*</span></label>
  <input type="password" [(ngModel)]="deletePin" placeholder="Enter admin PIN" autocomplete="off">
  <div class="action-row">
    <button type="button" class="danger" (click)="confirmDelete()">Confirm Delete</button>
    <button type="button" class="secondary" (click)="cancelDelete()">Cancel</button>
  </div>
</div>`
})
export class TournamentsComponent implements OnInit {
  tournaments: Tournament[]=[];
  allFormats = ['Singles','Doubles','Mixed Doubles','Team Event'];
  currencySymbol = '$';
  showAdminPin = false;
  deletePin = '';
  pendingDelete?: Tournament;
  editMode = false;
  model: Tournament=this.emptyModel();

  constructor(private api:ApiService, private admin: AdminAccessService){}
  ngOnInit(){this.load()}
  load(){this.api.tournamentsByPin(this.admin.currentPin()).subscribe(x=>this.tournaments=x)}
  emptyModel(): Tournament { return {name:'', tournamentType:'', registrationFee: 0, srrRounds:5, knockoutRounds:1, formats:['Singles'], status:'OPEN', adminPin:'', playersPerTeam:3, teamPlayerNames:[], discountOptions: this.defaultDiscountOptions() as any}; }
  defaultDiscountOptions(){
    return [
      {type:'EC_TEAM', label:'EC Team Discount', amount:0, enabled:false, eligibleNames:[]},
      {type:'PRESIDENT_PANEL', label:'President Panel Discount', amount:0, enabled:false, eligibleNames:[]},
      {type:'LIFETIME_MEMBER', label:'Life Time Members Discount', amount:0, enabled:false, eligibleNames:[]},
      {type:'WOMEN', label:'Women Player Discount', amount:0, enabled:false, eligibleNames:[]},
      {type:'SENIOR', label:'Senior Citizen Discount', amount:0, enabled:false, eligibleNames:[]},
      {type:'UNDER_21', label:'Under 21 Discount', amount:0, enabled:false, eligibleNames:[]},
      {type:'UNDER_18', label:'Under 18 Discount', amount:0, enabled:false, eligibleNames:[]}
    ];
  }
  multiFormatSelected(){ return (this.model.formats || []).length > 1; }
  needsNameList(type:string){ return ['EC_TEAM','PRESIDENT_PANEL','LIFETIME_MEMBER'].includes(type); }
  normalizeDiscountOptions(){
    this.model.discountOptions = (this.model.discountOptions || this.defaultDiscountOptions() as any).map((d:any)=>({
      ...d,
      amount: Number(d.amount || 0),
      eligibleNames: this.parseNames(d.eligibleNamesText || (d.eligibleNames || []).join(','))
    }));
  }
  parseNames(value:string): string[] {
    return String(value || '').split(/[\n,]+/).map(v=>v.trim()).filter(v=>v);
  }
  onTournamentTypeChange(){ this.resizeTeamPlayers(); }
  isFormatSelected(format:string){ return (this.model.formats || []).includes(format); }
  toggleFormat(format:string, event:any){
    const checked = event?.target?.checked;
    const existing = this.model.formats || [];
    this.model.formats = checked ? Array.from(new Set([...existing, format])) : existing.filter(f => f !== format);
    if(this.model.formats.length === 0) this.model.formats = ['Singles'];
    this.model.tournamentType = this.model.formats[0] || '';
    this.resizeTeamPlayers();
  }

  mergeDiscountOptions(existing:any[] = []) {
    const defs:any[] = this.defaultDiscountOptions();
    return defs.map(d => ({
      ...d,
      ...((existing || []).find((e:any) => e.type === d.type) || {})
    }));
  }

  formatDescription(format:string){
    if(format === 'Singles') return 'Individual matches (1 vs 1)';
    if(format === 'Doubles') return 'Two players per team (2 vs 2)';
    if(format === 'Mixed Doubles') return 'One male and one female per team (2 vs 2)';
    if(format === 'Team Event') return 'Organization team championship format';
    return '';
  }
  resizeTeamPlayers(){
    const count = this.isFormatSelected('Team Event') ? Number(this.model.playersPerTeam || 3) : 0;
    this.model.teamPlayerNames = Array.from({length: count}, (_,i)=> this.model.teamPlayerNames?.[i] || '');
  }
  participantCountLabel(){ return this.model.formats?.some(f => f === 'Doubles' || f === 'Mixed Doubles' || f === 'Team Event') ? 'Total Number of Teams' : 'Total Number of Players'; }
  save(){
    if(!this.model.formats || this.model.formats.length === 0) this.model.formats=['Singles'];
    this.model.tournamentType = this.model.formats[0] || '';
    this.model.registrationFee = Number(this.model.registrationFee || 0);
    this.normalizeDiscountOptions();
    this.model.srrRounds = Number(this.model.srrRounds || 5);
    this.model.knockoutRounds = Number(this.model.knockoutRounds || 0);
    this.model.totalNumberOfPlayers = this.model.totalNumberOfPlayers ? Number(this.model.totalNumberOfPlayers) : undefined;
    this.model.adminPin = (this.model.adminPin || '').replace(/[^0-9]/g, '').slice(0, 4);
    if (!this.model.adminPin || this.model.adminPin.length !== 4) {
      this.model.adminPin = this.admin.currentPin() || '1123';
    }
    if (!this.multiFormatSelected()) {
      this.model.tournamentEndDate = undefined;
    } else if (!this.model.tournamentEndDate) {
      this.model.tournamentEndDate = this.model.tournamentDate;
    }
    if (this.isFormatSelected('Team Event')) this.model.playersPerTeam = Number(this.model.playersPerTeam || 3);

    const payload: Tournament = JSON.parse(JSON.stringify(this.model));
    const request = this.editMode && payload.id ? this.api.updateTournament(payload.id, payload) : this.api.createTournament(payload);
    request.subscribe({
      next: () => {
        this.cancelEdit();
        this.load();
      },
      error: err => alert(this.displayError(err))
    });
  }

  displayError(err:any): string {
    if (!err) return 'Unable to save tournament';
    if (typeof err === 'string') return err;
    if (typeof err?.error === 'string') return err.error;
    if (err?.error?.message) return err.error.message;
    if (err?.message) return err.message;
    try { return JSON.stringify(err.error || err); } catch { return 'Unable to save tournament'; }
  }

  editTournament(t:Tournament){
    this.model = JSON.parse(JSON.stringify(t));
    this.model.discountOptions = this.mergeDiscountOptions((this.model.discountOptions as any) || []) as any;
    (this.model.discountOptions as any[]).forEach((d:any) => d.eligibleNamesText = (d.eligibleNames || []).join(', '));
    this.editMode = true;
    this.showAdminPin = false;
    window.scrollTo({top:0, behavior:'smooth'});
  }
  cancelEdit(){ this.model=this.emptyModel(); this.editMode=false; this.showAdminPin=false; }
  askDelete(t:Tournament){ this.pendingDelete = t; this.deletePin = ''; }
  cancelDelete(){ this.pendingDelete = undefined; this.deletePin = ''; }
  confirmDelete(){
    if(!this.pendingDelete?.id) return;
    this.api.deleteTournament(this.pendingDelete.id,this.deletePin).subscribe({
      next:()=>{ this.cancelDelete(); this.load(); },
      error:err=>alert(err?.error || 'Unable to delete tournament')
    });
  }
}
