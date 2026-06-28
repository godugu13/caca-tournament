
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Match, Tournament } from '../../models/models';

@Component({
  selector: 'app-player-score',
  standalone: true,
  imports: [FormsModule, NgIf, NgFor],
  template: `
<div class="player-score-page">
  <div class="mobile-score-card lookup-card" *ngIf="!match">
    <h2>Player Score Entry</h2>
    <p class="muted">Enter your registered phone number to open your latest unfinished score card.</p>

    <div class="readonly-context" *ngIf="hasUrlContext()">
      <b>{{selectedTournamentName()}}</b>
      <span>{{format}}</span>
    </div>

    <ng-container *ngIf="!hasUrlContext()">
      <label>Tournament</label>
      <select [(ngModel)]="tournamentId">
        <option value="">Select Tournament</option>
        <option *ngFor="let t of tournaments" [value]="t.id">{{t.name}}</option>
      </select>

      <label>Format</label>
      <select [(ngModel)]="format">
        <option>Singles</option>
        <option>Doubles</option>
        <option>Mixed Doubles</option>
        <option>Team Event</option>
      </select>
    </ng-container>

    <label>Registered Phone Number</label>
    <input type="tel" inputmode="tel" [(ngModel)]="phone" placeholder="Example: 5715358983 or +1 571-535-8983">

    <button type="button" class="primary full-width compact-main" (click)="lookup()">Open My Score Card</button>
    <p class="warning" *ngIf="message">{{message}}</p>
  </div>

  <div class="mobile-score-card score-entry-card" *ngIf="match">
    <div class="score-card-header modern">
      <div>
        <h2>Venue #{{match.boardNumber || responseVenue}}</h2>
        <p>{{selectedTournamentName()}} • {{format}}</p>
      </div>
      <span class="round-pill">{{roundLabelFor(match)}}</span>
    </div>

    <div class="mobile-vs polished-vs">
      <div class="mobile-team">
        <b>{{match.player1Name}}</b>
        <strong>{{total(1)}}</strong>
      </div>
      <div class="vs-circle">VS</div>
      <div class="mobile-team">
        <b>{{match.player2Name}}</b>
        <strong>{{total(2)}}</strong>
      </div>
    </div>

    <div class="round-tabs compact-tabs" *ngIf="accessibleRoundTabs().length > 1">
      <button type="button"
              *ngFor="let item of accessibleRoundTabs()"
              [class.active]="match?.id === item.id"
              (click)="selectAccessibleMatch(item)">
        {{roundLabelFor(item)}}
      </button>
    </div>

    <div class="score-entry-grid" *ngFor="let b of visibleBoards()">
      <label class="team-label left">{{shortName(match.player1Name)}}</label>
      <div class="board-center compact-board">
        <span>Board</span>
        <b>#{{b}}</b>
      </div>
      <label class="team-label right">{{shortName(match.player2Name)}}</label>

      <input class="score-input" type="number" min="0" max="25" inputmode="numeric"
             [disabled]="!!match.scoreFinalized"
             [(ngModel)]="p1Scores[b-1]"
             (ngModelChange)="scoreChanged(b, 1)">

      <button type="button" class="small-save compact-save"
              [disabled]="!!match.scoreFinalized || !dirty[b]"
              (click)="saveBoard(b)">Save</button>

      <input class="score-input" type="number" min="0" max="25" inputmode="numeric"
             [disabled]="!!match.scoreFinalized"
             [(ngModel)]="p2Scores[b-1]"
             (ngModelChange)="scoreChanged(b, 2)">
    </div>

    <p class="warning small-note" *ngIf="reached25() && !match.scoreFinalized">One side reached 25. Please finalize when complete.</p>

    <div class="score-actions-row">
      <button type="button" class="yellow-btn compact-action"
              [disabled]="!!match.scoreFinalized"
              (click)="finalize()">Finalize</button>
      <button type="button" class="secondary compact-action" (click)="resetLookup()">Different Phone</button>
    </div>

    <p class="ok center" *ngIf="match.scoreFinalized">Score finalized. Contact admin for correction.</p>

    <section class="audit-footer">
      <p>Only assigned players can update this venue score card.</p>
      <p>Updates are audited with timestamp, IP address, device/browser, and optional location if allowed.</p>
    </section>
  </div>
</div>
`
})
export class PlayerScoreComponent implements OnInit {
  tournaments: Tournament[] = [];
  tournamentId = '';
  format = 'Singles';
  phone = '';
  message = '';
  match?: Match;
  previousRounds: Match[] = [];
  currentRoundTab = 'CURRENT';
  roundLabel = '';
  responseVenue = '';
  p1Scores: any[] = [];
  p2Scores: any[] = [];
  dirty: {[board: number]: boolean} = {};
  boards = [1,2,3,4,5,6,7,8];
  latitude?: number;
  longitude?: number;
  locationPermissionMessage = '';

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      this.tournamentId = params.get('tournamentId') || localStorage.getItem('activeTournamentId') || '';
      this.format = params.get('format') || localStorage.getItem('activeFormat') || 'Singles';
    });
    this.api.tournaments().subscribe(t => this.tournaments = t || []);
  }



  hasUrlContext(): boolean {
    return !!this.route.snapshot.queryParamMap.get('tournamentId') && !!this.route.snapshot.queryParamMap.get('format');
  }


  selectedTournamentName(): string {
    return this.tournaments.find(t => t.id === this.tournamentId)?.name || 'Tournament';
  }

  normalizePhoneInput(value: string): string {
    return String(value || '').replace(/[^0-9]/g, '');
  }

  lookup() {
    this.message = '';
    this.match = undefined;
    if (!this.tournamentId || !this.format || !this.phone) {
      this.message = 'Please select tournament, format, and enter phone number.';
      return;
    }
    this.api.playerScoreLookup(this.tournamentId, this.format, this.normalizePhoneInput(this.phone)).subscribe({
      next: res => {
        if (!res.found || !res.match) {
          this.message = res.message || 'No score card found.';
          return;
        }
        this.previousRounds = res.accessibleMatches || [];
        this.match = res.match;
        this.roundLabel = res.roundLabel || this.roundLabelFor(this.match);
        this.responseVenue = res.venue || '';
        this.syncFromMatch();
        this.requestLocationForAudit();
      },
      error: err => this.message = err?.error?.message || 'Unable to lookup score card.'
    });
  }

  normalize(scores?: number[]): any[] {
    const arr: any[] = scores ? [...scores] : [];
    while (arr.length < 8) arr.push(null);
    return arr.slice(0, 8);
  }

  visibleBoards(): number[] {
    if (!this.match) return [];
    if (this.match.scoreFinalized) {
      return this.boards.filter(b => Number(this.p1Scores[b-1] || 0) !== 0 || Number(this.p2Scores[b-1] || 0) !== 0);
    }
    const visible: number[] = [];
    for (const b of this.boards) {
      visible.push(b);
      if (!this.hasScore(b)) break;
      if (this.runningTotal(b, 1) >= 25 || this.runningTotal(b, 2) >= 25) break;
    }
    return visible.length ? visible : [1];
  }

  scoreChanged(board: number, side: 1|2) {
    const i = board - 1;
    if (side === 1 && this.entered(this.p1Scores[i])) this.p2Scores[i] = 0;
    if (side === 2 && this.entered(this.p2Scores[i])) this.p1Scores[i] = 0;
    this.dirty[board] = this.hasScore(board);
  }

  saveBoard(board: number) {
    if (!this.match?.id || !this.hasScore(board)) return;
    const i = board - 1;
    this.api.playerSaveBoard(this.match.id, board, this.numberOrNull(this.p1Scores[i]), this.numberOrNull(this.p2Scores[i]), this.normalizePhoneInput(this.phone), this.auditMeta('SAVE')).subscribe({
      next: saved => {
        this.match = saved;
        this.replaceAccessibleMatch(saved);
        this.syncFromMatch();
        this.dirty[board] = false;
      },
      error: err => this.message = err?.error?.message || 'Unable to save score.'
    });
  }

  finalize() {
    if (!this.match?.id) return;
    this.applyLocalScoresToMatch();
    this.api.playerFinalizeScore(this.match, this.normalizePhoneInput(this.phone), this.auditMeta('FINALIZE')).subscribe({
      next: saved => {
        this.match = saved;
        this.replaceAccessibleMatch(saved);
        this.syncFromMatch();
        this.dirty = {};
      },
      error: err => this.message = err?.error?.message || 'Unable to finalize score.'
    });
  }

  total(side: 1|2): number {
    const values = side === 1 ? this.p1Scores : this.p2Scores;
    const total = values.filter(v => this.entered(v)).reduce((sum, v) => sum + Number(v || 0), 0);
    return Math.min(25, total);
  }

  runningTotal(board: number, side: 1|2): number {
    const values = side === 1 ? this.p1Scores : this.p2Scores;
    return values.slice(0, board).reduce((sum, v) => sum + Number(v || 0), 0);
  }

  reached25(): boolean {
    return this.total(1) >= 25 || this.total(2) >= 25;
  }

  hasScore(board: number): boolean {
    const i = board - 1;
    return this.entered(this.p1Scores[i]) || this.entered(this.p2Scores[i]);
  }

  entered(v: any): boolean {
    return v !== undefined && v !== null && String(v) !== '';
  }

  numberOrNull(v: any): number | null {
    return this.entered(v) ? Number(v) : null;
  }

  shortName(name?: string): string {
    return (name || 'Team').split('/')[0].trim();
  }


  syncFromMatch() {
    if (!this.match) return;
    this.p1Scores = this.normalize(this.match.player1BoardScores);
    this.p2Scores = this.normalize(this.match.player2BoardScores);
  }


  replaceAccessibleMatch(saved: Match) {
    const index = this.previousRounds.findIndex(m => m.id === saved.id);
    if (index >= 0) {
      this.previousRounds[index] = saved;
    } else {
      this.previousRounds.push(saved);
    }
  }

  applyLocalScoresToMatch() {
    if (!this.match) return;
    this.match.player1BoardScores = this.p1Scores.map(v => this.entered(v) ? Number(v) : null as any);
    this.match.player2BoardScores = this.p2Scores.map(v => this.entered(v) ? Number(v) : null as any);
  }

  accessibleRoundTabs(): Match[] {
    const all = this.previousRounds && this.previousRounds.length
      ? this.previousRounds
      : (this.match ? [this.match] : []);
    return [...all].sort((a, b) => this.roundSort(a) - this.roundSort(b));
  }

  selectAccessibleMatch(item: Match) {
    this.match = item;
    this.roundLabel = this.roundLabelFor(item);
    this.responseVenue = item.boardNumber || '';
    this.syncFromMatch();
    this.dirty = {};
  }

  roundLabelFor(m?: Match): string {
    if (!m) return 'Current Round';
    const type = (m.roundType || 'SRR').toUpperCase();
    if (type === 'SRR') return `SRR Round ${m.roundNumber}`;
    if (type === 'PRE_QUARTERS') return 'Pre-Quarters';
    if (type === 'QUARTERS') return 'Quarters';
    if (type === 'SEMIFINALS') return 'Semifinals';
    if (type === 'FINALS') return 'Finals';
    return type.replace('_', ' ');
  }

  roundSort(m: Match): number {
    const type = (m.roundType || 'SRR').toUpperCase();
    const base: {[key: string]: number} = {
      'SRR': 100,
      'PRE_QUARTERS': 200,
      'QUARTERS': 300,
      'SEMIFINALS': 400,
      'FINALS': 500
    };
    return (base[type] || 0) + (type === 'SRR' ? (m.roundNumber || 0) : 0);
  }


  requestLocationForAudit() {
    if (!navigator.geolocation) {
      this.locationPermissionMessage = 'Location not supported on this device.';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        this.latitude = position.coords.latitude;
        this.longitude = position.coords.longitude;
        this.locationPermissionMessage = 'Location captured for audit.';
      },
      () => {
        this.locationPermissionMessage = 'Location permission not provided. Score entry can continue.';
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
    );
  }

  auditMeta(actionType: string): any {
    return {
      actionType,
      latitude: this.latitude,
      longitude: this.longitude,
      geoLocation: this.latitude !== undefined && this.longitude !== undefined
        ? `${this.latitude},${this.longitude}`
        : ''
    };
  }

  resetLookup() {
    this.match = undefined;
    this.message = '';
    this.dirty = {};
  }
}
