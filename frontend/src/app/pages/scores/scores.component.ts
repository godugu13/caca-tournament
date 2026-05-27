import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AdminAccessService } from '../../services/admin-access.service';
import { Match, Tournament } from '../../models/models';

@Component({
  selector: 'app-scores',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf],
  template: `
<h2>Scores</h2>

<div class="card form">
  <label>Tournament</label>
  <select [(ngModel)]="selectedTournamentId" (change)="rememberAndLoad()">
    <option value="">Select Tournament</option>
    <option *ngFor="let t of tournaments" [value]="t.id">{{t.name}}</option>
  </select>

  <label>Format</label>
  <select [(ngModel)]="format" (change)="rememberAndLoad()">
    <option>Singles</option>
    <option>Doubles</option>
    <option>Mixed Doubles</option>
    <option>Team Event</option>
  </select>
</div>

<div *ngIf="selectedTournamentId && matches.length" class="card">
  <h3>Current Round Scores</h3>
  <p class="muted">Use this page for SRR rounds and knockout rounds: Pre-Quarters, Quarters, Semifinals, and Finals.</p>
  <div class="round-tabs">
    <button type="button" *ngFor="let r of roundTabs()" [class.active-tab]="r.key === selectedRoundKey" (click)="selectRound(r.key)">
      {{r.label}}
    </button>
  </div>
  <p><b>Displaying:</b> {{selectedRoundLabel()}}</p>
</div>

<div *ngIf="selectedTournamentId && !matches.length" class="card">
  <p class="muted">No generated matches found for this tournament and format.</p>
</div>

<div *ngIf="selectedTournamentId">
  <div class="score-card" *ngFor="let m of visibleMatches()" [attr.id]="matchAnchor(m)">
    <ng-container *ngIf="m.status !== 'BYE'; else byeScore">
      <div class="score-header">
        <b>{{m.roundType || 'SRR'}} Round {{m.roundNumber}} - Venue #{{m.boardNumber}}</b>
        <span [class.ok]="m.scoreFinalized">{{m.scoreFinalized ? 'Finalized' : 'In Progress'}}</span>
      </div>

      <div class="score-vs-layout">
        <div class="team-side left-team">
          <b>{{m.player1Name}}</b>
          <span class="total-highlight">Total: {{total(m, 1)}}</span>
        </div>
        <div class="center-board-title">Board</div>
        <div class="team-side right-team">
          <b>{{m.player2Name}}</b>
          <span class="total-highlight">Total: {{total(m, 2)}}</span>
        </div>
      </div>

      <p class="muted" *ngIf="m.scoreFinalized && visibleBoards(m).length === 0">No played board scores to display.</p>

      <div class="board-score-row" *ngFor="let board of visibleBoards(m)">
        <input class="score" type="number" inputmode="numeric" min="0" max="25"
               [disabled]="m.scoreFinalized"
               [(ngModel)]="m.player1BoardScores![board-1]"
               (ngModelChange)="scoreChanged(m, board, 1)">

        <div class="board-pill">#{{board}}</div>

        <input class="score" type="number" inputmode="numeric" min="0" max="25"
               [disabled]="m.scoreFinalized"
               [(ngModel)]="m.player2BoardScores![board-1]"
               (ngModelChange)="scoreChanged(m, board, 2)">

        <button type="button" class="icon-save" title="Save board score"
                [disabled]="m.scoreFinalized || !dirtyKeyMap[boardKey(m, board)]"
                (click)="saveBoard($event, m, board)">💾</button>
      </div>

      <p class="warning" *ngIf="reached25(m) && !m.scoreFinalized">One team reached 25 points. You can finalize now.</p>

      <div class="score-actions finalize-row">
        <button type="button" class="yellow-btn" [disabled]="m.scoreFinalized" (click)="finalize($event, m)">Finalize Score</button>
        <button type="button" class="secondary" *ngIf="m.scoreFinalized" (click)="reopen($event, m)">Edit</button>
      </div>
    </ng-container>

    <ng-template #byeScore>
      <div class="score-header">
        <b>{{m.roundType || 'SRR'}} Round {{m.roundNumber}} - BYE</b>
        <span [class.ok]="m.scoreFinalized">{{m.scoreFinalized ? 'Finalized' : 'In Progress'}}</span>
      </div>
      <div class="bye-card">
        <b>{{m.player1Name}}</b>
        <span>BYE / Walkover Points</span>
        <input class="score" type="number" inputmode="numeric" min="0" max="25"
               [disabled]="m.scoreFinalized"
               [(ngModel)]="m.player1Score"
               (ngModelChange)="byeChanged(m)">
        <button type="button" class="icon-save" title="Save BYE score" [disabled]="m.scoreFinalized || !byeDirtyMap[matchKey(m)]" (click)="saveBye($event, m, false)">💾</button>
        <button type="button" class="yellow-btn" [disabled]="m.scoreFinalized" (click)="saveBye($event, m, true)">Finalize BYE Score</button>
        <button type="button" class="secondary" *ngIf="m.scoreFinalized" (click)="reopen($event, m)">Edit</button>
      </div>
    </ng-template>
  </div>
</div>

<div *ngIf="selectedTournamentId && visibleMatches().length && allCurrentRoundFinalized()" class="card next-step-card">
  <h3>Current Round Completed</h3>
  <p>All scores for {{selectedRoundLabel()}} are finalized.</p>
  <button type="button" class="primary" (click)="goToStandings()">View Current Standings</button>
  <button type="button" class="yellow-btn" (click)="goToGameDay()">Generate Next SRR / Knockout Round</button>
</div>
` })
export class ScoresComponent implements OnInit {
  tournaments: Tournament[] = [];
  matches: Match[] = [];
  selectedTournamentId = '';
  format = 'Singles';
  boards = [1,2,3,4,5,6,7,8];
  selectedRoundKey = '';
  dirtyKeyMap: {[key: string]: boolean} = {};
  byeDirtyMap: {[key: string]: boolean} = {};

  constructor(private api: ApiService, private admin: AdminAccessService, private router: Router) {}

  ngOnInit() {
    this.selectedTournamentId = localStorage.getItem('activeTournamentId') || '';
    this.format = localStorage.getItem('activeFormat') || 'Singles';
    this.api.tournamentsByPin(this.admin.currentPin()).subscribe(t => {
      this.tournaments = t;
      if (this.selectedTournamentId) this.loadMatches();
    });
  }

  rememberAndLoad() {
    localStorage.setItem('activeTournamentId', this.selectedTournamentId || '');
    localStorage.setItem('activeFormat', this.format || 'Singles');
    this.loadMatches();
  }

  loadMatches(keepRound = false) {
    if (!this.selectedTournamentId) return;
    const previousKey = this.selectedRoundKey;
    this.api.matches(this.selectedTournamentId, this.format, '').subscribe(m => {
      this.matches = m || [];
      this.matches.forEach(match => this.ensureBoardArrays(match));
      this.selectedRoundKey = keepRound && previousKey ? previousKey : this.currentRoundKey();
    });
  }

  ensureBoardArrays(m: Match) {
    m.player1BoardScores = this.normalizeScores(m.player1BoardScores);
    m.player2BoardScores = this.normalizeScores(m.player2BoardScores);
  }

  normalizeScores(scores?: number[]): number[] {
    const result = scores ? [...scores] : [];
    while (result.length < 8) result.push(undefined as any);
    return result.slice(0, 8);
  }

  total(m: Match, side: 1|2): number {
    const scores = side === 1 ? m.player1BoardScores : m.player2BoardScores;
    const total = (scores || [])
      .filter(v => v !== undefined && v !== null && String(v) !== '')
      .reduce((sum, v) => sum + Number(v), 0);
    return Math.min(25, total);
  }

  scoreChanged(m: Match, board: number, side: 1|2) {
    const i = board - 1;
    this.ensureBoardArrays(m);
    const p1 = m.player1BoardScores![i];
    const p2 = m.player2BoardScores![i];
    if (side === 1 && this.valueEntered(p1)) m.player2BoardScores![i] = 0;
    if (side === 2 && this.valueEntered(p2)) m.player1BoardScores![i] = 0;
    this.dirtyKeyMap[this.boardKey(m, board)] = this.boardHasScore(m, board);
  }

  byeChanged(m: Match) {
    this.byeDirtyMap[this.matchKey(m)] = true;
  }

  valueEntered(v: any): boolean {
    return v !== undefined && v !== null && String(v) !== '';
  }

  boardHasScore(m: Match, board: number): boolean {
    const i = board - 1;
    return this.valueEntered(m.player1BoardScores?.[i]) || this.valueEntered(m.player2BoardScores?.[i]);
  }

  boardHasNonZeroScore(m: Match, board: number): boolean {
    const i = board - 1;
    const p1 = Number(m.player1BoardScores?.[i] || 0);
    const p2 = Number(m.player2BoardScores?.[i] || 0);
    return p1 !== 0 || p2 !== 0;
  }

  visibleBoards(m: Match): number[] {
    if (m.scoreFinalized) {
      // Step 15A: after finalizing, hide board rows where both sides are 0.
      // Example: if Board #5 was never played and saved/finalized as 0 - 0,
      // it should not appear in the finalized score card.
      return this.boards.filter(b => this.boardHasNonZeroScore(m, b));
    }
    const visible: number[] = [];
    for (const b of this.boards) {
      visible.push(b);
      if (!this.boardHasScore(m, b)) break;
      if (this.runningTotalThrough(m, b, 1) >= 25 || this.runningTotalThrough(m, b, 2) >= 25) break;
    }
    return visible.length ? visible : [1];
  }

  runningTotalThrough(m: Match, board: number, side: 1|2): number {
    const scores = side === 1 ? m.player1BoardScores : m.player2BoardScores;
    return (scores || []).slice(0, board).reduce((sum, v) => sum + Number(v || 0), 0);
  }

  reached25(m: Match): boolean {
    return this.total(m, 1) >= 25 || this.total(m, 2) >= 25;
  }

  saveBoard(event: Event, m: Match, board: number) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.boardHasScore(m, board)) return;
    this.ensureBoardArrays(m);
    m.scoreFinalized = false;
    const key = this.boardKey(m, board);
    this.api.saveScore(m).subscribe(saved => {
      Object.assign(m, saved);
      this.ensureBoardArrays(m);
      this.dirtyKeyMap[key] = false;
    });
  }

  finalize(event: Event, m: Match) {
    event.preventDefault();
    event.stopPropagation();
    this.ensureBoardArrays(m);
    const lastPlayedIndex = Math.max(
      ...this.boards.filter(b => this.boardHasScore(m, b)).map(b => b - 1),
      0
    );
    m.player1BoardScores = (m.player1BoardScores || []).slice(0, lastPlayedIndex + 1).map(v => this.valueEntered(v) ? Number(v) : 0);
    m.player2BoardScores = (m.player2BoardScores || []).slice(0, lastPlayedIndex + 1).map(v => this.valueEntered(v) ? Number(v) : 0);
    m.scoreFinalized = true;
    this.api.saveScore(m).subscribe(saved => {
      Object.assign(m, saved);
      this.ensureBoardArrays(m);
      this.clearDirtyForMatch(m);
      setTimeout(() => {
        if (this.allCurrentRoundFinalized()) this.goToStandings();
      }, 50);
    });
  }

  reopen(event: Event, m: Match) {
    event.preventDefault();
    event.stopPropagation();
    m.scoreFinalized = false;
    m.status = 'IN_PROGRESS';
    this.api.saveScore(m).subscribe(saved => {
      Object.assign(m, saved);
      this.ensureBoardArrays(m);
    });
  }

  saveBye(event: Event, m: Match, finalized: boolean) {
    event.preventDefault();
    event.stopPropagation();
    m.player1BoardScores = [];
    m.player2BoardScores = [];
    m.player1Score = m.player1Score == null ? 0 : m.player1Score;
    m.player2Score = 0;
    m.scoreFinalized = finalized;
    const key = this.matchKey(m);
    this.api.saveScore(m).subscribe(saved => {
      Object.assign(m, saved);
      this.ensureBoardArrays(m);
      this.byeDirtyMap[key] = false;
      if (finalized && this.allCurrentRoundFinalized()) this.goToStandings();
    });
  }

  roundTabs(): { key: string, label: string, sort: number }[] {
    const seen = new Map<string, { key: string, label: string, sort: number }>();
    for (const m of this.matches) {
      const key = this.roundKey(m);
      if (!seen.has(key)) {
        seen.set(key, { key, label: this.roundLabelForMatch(m), sort: this.roundSortValue(m) });
      }
    }
    return Array.from(seen.values()).sort((a,b) => b.sort - a.sort);
  }

  currentRoundKey(): string {
    const tabs = this.roundTabs();
    return tabs.length ? tabs[0].key : '';
  }

  selectRound(key: string) {
    this.selectedRoundKey = key;
  }

  selectedRoundLabel(): string {
    const tab = this.roundTabs().find(r => r.key === this.selectedRoundKey);
    return tab?.label || 'Current Round';
  }

  roundKey(m: Match): string {
    return `${m.roundType || 'SRR'}:${m.roundNumber}`;
  }

  roundLabelForMatch(m: Match): string {
    if (m.roundType && m.roundType !== 'SRR') return this.stageDisplay(m.roundType);
    return `SRR Round ${m.roundNumber}`;
  }

  roundSortValue(m: Match): number {
    const type = (m.roundType || 'SRR').toUpperCase();
    const stageOrder: {[key: string]: number} = {
      'SRR': 100,
      'PRE_QUARTERS': 200,
      'QUARTERS': 300,
      'SEMIFINALS': 400,
      'FINALS': 500
    };
    return (stageOrder[type] || 0) + (type === 'SRR' ? (m.roundNumber || 0) : 0);
  }

  stageDisplay(stage?: string): string {
    if(stage === 'PRE_QUARTERS') return 'Pre-Quarters';
    if(stage === 'QUARTERS') return 'Quarters';
    if(stage === 'SEMIFINALS') return 'Semifinals';
    if(stage === 'FINALS') return 'Finals';
    return stage || 'Round';
  }

  visibleMatches(): Match[] {
    if (!this.selectedRoundKey) return [];
    return this.matches.filter(m => this.roundKey(m) === this.selectedRoundKey);
  }

  allCurrentRoundFinalized(): boolean {
    const current = this.visibleMatches();
    return current.length > 0 && current.every(m => !!m.scoreFinalized);
  }

  goToStandings() {
    if (!this.selectedTournamentId || !this.format) return;
    this.router.navigate(['/standings', this.selectedTournamentId, this.format]);
  }

  goToGameDay() {
    if (this.selectedTournamentId) localStorage.setItem('activeTournamentId', this.selectedTournamentId);
    if (this.format) localStorage.setItem('activeFormat', this.format);
    this.router.navigate(['/gameday']);
  }

  matchKey(m: Match): string {
    return m.id || `${m.tournamentId}-${m.format}-${m.roundNumber}-${m.boardNumber}`;
  }

  boardKey(m: Match, board: number): string {
    return `${this.matchKey(m)}-${board}`;
  }

  matchAnchor(m: Match): string {
    return `match-${this.matchKey(m).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  }

  clearDirtyForMatch(m: Match) {
    this.boards.forEach(b => this.dirtyKeyMap[this.boardKey(m, b)] = false);
    this.byeDirtyMap[this.matchKey(m)] = false;
  }
}
