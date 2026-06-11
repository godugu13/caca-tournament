import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf, NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AdminAccessService } from '../../services/admin-access.service';
import { Match, Standing, Tournament } from '../../models/models';

type ResultGroup = { stage: string; label: string; matches: Match[]; groups: BracketGroup[] };
type HistoryGroup = { key: string; label: string; matches: Match[] };
type BracketGroup = { name: string; quarters: Match[]; semis: Match[]; finals: Match[] };

@Component({
  selector: 'app-standings',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf, NgTemplateOutlet],
  template: `
<h2>{{selectedTournamentName || 'Rankings / Reports'}}</h2>
<p *ngIf="selectedTournamentName" class="muted">Results and standings for {{selectedTournamentName}} - {{format}}</p>
<p *ngIf="standingsRoundLabel" class="status-line"><b>{{standingsRoundLabel}}</b></p>

<div class="card form inline">
  <select [(ngModel)]="tournamentId" (change)="onTournamentChange()">
    <option value="">Select Tournament</option>
    <option *ngFor="let t of tournaments" [value]="t.id">{{t.name}}</option>
  </select>
  <select [(ngModel)]="format" (change)="remember()">
    <option>Singles</option>
    <option>Doubles</option>
    <option>Mixed Doubles</option>
    <option>Team Event</option>
  </select>
  <button (click)="load()" [disabled]="!tournamentId">Show Standings</button>
</div>

<div *ngIf="bracketGroups.length > 0" class="blue-knockout-wrapper">
  <section class="blue-bracket-board" *ngFor="let group of bracketGroups">
    <header class="blue-hero">
      <div class="caca-brand">
        <div class="caca-logo">CACA 3.0™</div>
        <div>
          <h2>CACA 3.0™</h2>
          <p>LET'S PLAY TOGETHER!</p>
        </div>
      </div>

      <div class="blue-title">
        <h1>KNOCKOUT ROUNDS</h1>
        <p>{{group.name}} • Tournament Bracket</p>
      </div>

      <div class="cup-panel">
        <span>🏆</span>
        <div>
          <b>TOURNAMENT CUP</b>
          <small>RESULTS</small>
        </div>
      </div>
    </header>

    <nav class="bracket-tabs">
      <span class="active-tab">🏆 Knockout Bracket</span>
      <span>📊 Standings</span>
      <span>↩ History</span>
    </nav>

    <div class="status-strip">
      <div>
        <b>{{currentKnockoutMessage(group)}}</b>
        <span>Winners advance to the next round. Final winner is highlighted as champion.</span>
      </div>
      <button type="button" (click)="load()">↻ Refresh</button>
    </div>

    <div class="blue-round-labels">
      <span>Quarter Finals</span>
      <span>Semi Finals</span>
      <span>Finals</span>
    </div>

    <div class="blue-bracket-grid">
      <div class="quarter-column">
        <div class="blue-match qf-match" *ngFor="let m of qfAll(group); let i = index">
          <ng-container *ngTemplateOutlet="blueMatchRows; context: { match: m, matchIndex: i, roundName: 'QF' }"></ng-container>
        </div>
      </div>

      <div class="semi-column">
        <div class="blue-match semi-match" *ngFor="let m of sfAll(group); let i = index">
          <ng-container *ngTemplateOutlet="blueMatchRows; context: { match: m, matchIndex: i, roundName: 'SF' }"></ng-container>
        </div>
      </div>

      <div class="final-column-blue">
        <div class="blue-match final-blue-match" *ngFor="let m of finalMatches(group); let i = index">
          <ng-container *ngTemplateOutlet="blueMatchRows; context: { match: m, matchIndex: i, roundName: 'FINAL' }"></ng-container>
        </div>

        <div class="champion-highlight">
          <div class="gold-trophy">🏆</div>
          <div class="champion-ribbon">CHAMPION</div>
          <strong>{{championName(group)}}</strong>
        </div>
      </div>
    </div>

    <ng-template #blueMatchRows let-match="match" let-matchIndex="matchIndex" let-roundName="roundName">
      <div class="blue-player-row"
           [class.blue-winner]="winnerId(match) === match.player1Id"
           [class.not-qualified]="isPlaceholder(match.player1Name)">
        <span class="blue-seed">{{match.player1Rank || '-'}}</span>
        <span class="player-photo">{{playerAvatar(match.player1Name)}}</span>
        <span class="player-flag">{{playerFlag(match.player1Name)}}</span>
        <span class="blue-player-name">{{displayNameForSlot(match.player1Name, matchIndex, true, roundName)}}</span>
        <strong class="blue-score">{{scoreText(match, true)}}</strong>
      </div>

      <div class="vs-badge">vs</div>

      <div class="blue-player-row"
           [class.blue-winner]="winnerId(match) === match.player2Id"
           [class.not-qualified]="isPlaceholder(match.player2Name)">
        <span class="blue-seed">{{match.player2Rank || '-'}}</span>
        <span class="player-photo">{{playerAvatar(match.player2Name)}}</span>
        <span class="player-flag">{{playerFlag(match.player2Name)}}</span>
        <span class="blue-player-name">{{displayNameForSlot(match.player2Name, matchIndex, false, roundName)}}</span>
        <strong class="blue-score">{{scoreText(match, false)}}</strong>
      </div>
    </ng-template>

    <div class="blue-legend">
      <span><i class="legend-winner"></i> Winner</span>
      <span><i class="legend-pending"></i> Yet To Play</span>
      <span><i class="legend-empty"></i> Not Qualified</span>
    </div>

    <footer class="blue-footer">
      <span>📞 CACA Tournament Desk</span>
      <span>🌐 WWW.CACA-INC.COM</span>
      <span>✉️ Cacafunds&#64;gmail.com</span>
    </footer>
  </section>
</div>

<div *ngIf="latestKnockoutResults.length > 0" class="card results-card">
  <h3>Knockout Results</h3>
  <p class="muted">Latest completed knockout round is shown first. Earlier completed knockout rounds are shown below it.</p>

  <div *ngFor="let group of latestKnockoutResults" class="result-section">
    <h4>{{group.label}} Results</h4>
    <div class="match-grid">
      <div class="match-card" *ngFor="let m of group.matches">
        <b>{{roundGroupLabel(m)}} {{group.label}} - Board #{{m.boardNumber}}</b>
        <div class="result-row winner-row" *ngIf="winnerName(m)">
          <span>Winner</span>
          <b>Rank {{winnerRank(m) || '-'}}: {{winnerName(m)}}</b>
          <span>{{winnerScore(m)}} pts</span>
        </div>
        <div class="result-row loser-row" *ngIf="loserName(m)">
          <span>Loser</span>
          <span>Rank {{loserRank(m) || '-'}}: {{loserName(m)}}</span>
          <span>{{loserScore(m)}} pts</span>
        </div>
      </div>
    </div>
  </div>
</div>

<div *ngIf="standings.length === 0" class="card empty-state">No finalized SRR standings available yet for this tournament.</div>

<div *ngIf="standings.length > 0" class="card standings-card">
  <h3>{{srrStandingsTitle}}</h3>
  <table>
    <tr>
      <th>Rank</th><th>Player / Team</th><th>Wins</th><th>PF</th><th>PA</th><th>Point Diff</th>
      <th *ngIf="isSuperAdmin()">Wins Adj</th><th *ngIf="isSuperAdmin()">PD Adj</th><th *ngIf="isSuperAdmin()">Reason</th><th *ngIf="isSuperAdmin()">Save</th>
    </tr>
    <tr *ngFor="let s of standings">
      <td>{{s.rank}}</td>
      <td>{{s.playerName}}</td>
      <td>{{s.wins}}</td>
      <td>{{s.pointsFor}}</td>
      <td>{{s.pointsAgainst}}</td>
      <td>{{s.pointsDifferential}}</td>
      <td *ngIf="isSuperAdmin()"><input class="tiny-input" type="number" [(ngModel)]="s.winsAdjustment"></td>
      <td *ngIf="isSuperAdmin()"><input class="tiny-input" type="number" [(ngModel)]="s.pointsDifferentialAdjustment"></td>
      <td *ngIf="isSuperAdmin()"><input class="reason-input" [(ngModel)]="s.adjustmentReason" placeholder="Reason"></td>
      <td *ngIf="isSuperAdmin()"><button type="button" class="small" (click)="saveAdjustment(s)">Save</button></td>
    </tr>
  </table>
  <p class="muted" *ngIf="isSuperAdmin()">Super Admin changes to Wins or Point Diff immediately affect ranking, next SRR pairings, and knockout seeding after refresh/regeneration.</p>
</div>

<div *ngIf="historyGroups.length > 0" class="card history-card">
  <h3>View Previous Rounds / Brackets</h3>
  <p class="muted">Use these tabs to view backwards from Finals/Semis/Quarters through SRR Round #1.</p>
  <div class="previous-tabs">
    <button type="button" class="secondary small" *ngFor="let group of historyGroups" (click)="selectedHistoryKey = group.key" [class.active-tab]="selectedHistoryKey === group.key">
      {{group.label}}
    </button>
  </div>

  <div *ngIf="selectedHistoryGroup() as group" class="history-details">
    <h4>{{group.label}}</h4>
    <div class="match-grid">
      <div class="match-card" *ngFor="let m of group.matches">
        <b>{{roundGroupLabel(m)}} {{matchRoundLabel(m)}} - {{m.status === 'BYE' ? 'BYE' : 'Board #' + m.boardNumber}}</b>
        <p>Rank {{m.player1Rank || '-'}}: {{m.player1Name}} <b *ngIf="m.scoreFinalized">{{m.player1Score || 0}}</b></p>
        <ng-container *ngIf="m.status !== 'BYE'; else byeBlock">
          <p>vs</p>
          <p>Rank {{m.player2Rank || '-'}}: {{m.player2Name}} <b *ngIf="m.scoreFinalized">{{m.player2Score || 0}}</b></p>
          <p *ngIf="m.scoreFinalized && winnerName(m)" class="ok">Winner: Rank {{winnerRank(m) || '-'}} {{winnerName(m)}}</p>
        </ng-container>
        <ng-template #byeBlock><p class="ok">BYE points: {{m.player1Score || 0}}</p></ng-template>
        <small>Status: {{m.scoreFinalized ? 'Finalized' : (m.status || 'Generated')}}</small>
      </div>
    </div>
  </div>
</div>`
})
export class StandingsComponent implements OnInit {
  tournaments: Tournament[] = [];
  standings: Standing[] = [];
  matches: Match[] = [];
  latestKnockoutResults: ResultGroup[] = [];
  historyGroups: HistoryGroup[] = [];
  bracketGroups: BracketGroup[] = [];
  tournamentId = '';
  format = 'Singles';
  selectedTournamentName = '';
  standingsRoundLabel = '';
  srrStandingsTitle = 'Current SRR Standings';
  latestKnockoutTitle = 'Tournament Cup';
  selectedHistoryKey = '';

  constructor(private api: ApiService, private route: ActivatedRoute, private admin: AdminAccessService) {}

  ngOnInit(): void {
    this.tournamentId = this.route.snapshot.paramMap.get('tournamentId') || localStorage.getItem('activeTournamentId') || '';
    this.format = this.route.snapshot.paramMap.get('format') || localStorage.getItem('activeFormat') || 'Singles';

    this.api.tournaments().subscribe(tournaments => {
      this.tournaments = tournaments || [];
      this.setTournamentName();
      if (this.tournamentId) this.load();
    });
  }

  onTournamentChange(): void {
    const selected = this.tournaments.find(t => t.id === this.tournamentId);
    if (selected) this.format = selected.tournamentType || (selected.formats && selected.formats.length ? selected.formats[0] : this.format);
    this.remember();
  }

  remember(): void {
    localStorage.setItem('activeTournamentId', this.tournamentId || '');
    localStorage.setItem('activeFormat', this.format || 'Singles');
    this.setTournamentName();
  }

  load(): void {
    if (!this.tournamentId) return;
    this.remember();
    this.api.standings(this.tournamentId, this.format).subscribe(s => this.standings = s || []);
    this.api.matches(this.tournamentId, this.format, '').subscribe(matches => {
      this.matches = matches || [];
      this.standingsRoundLabel = this.buildStandingsRoundLabel(this.matches);
      this.srrStandingsTitle = this.buildSrrStandingsTitle(this.matches);
      this.latestKnockoutResults = this.buildKnockoutResultGroups(this.matches);
      this.bracketGroups = this.buildBracketGroups(this.matches);
      this.latestKnockoutTitle = this.buildLatestKnockoutTitle(this.matches);
      this.historyGroups = this.buildHistoryGroups(this.matches);
      this.selectedHistoryKey = this.historyGroups.length ? this.historyGroups[0].key : '';
    });
  }

  selectedHistoryGroup(): HistoryGroup | undefined { return this.historyGroups.find(g => g.key === this.selectedHistoryKey); }

  private buildBracketGroups(matches: Match[]): BracketGroup[] {
    const knockout = matches.filter(m => this.isKnockout(m));
    if (!knockout.length) return [];
    const groups = [...new Set(knockout.map(m => this.normalizedGroup(m.roundGroup)))];
    return groups.map(name => ({
      name,
      quarters: this.matchesForStageAndGroup(matches, 'QUARTERS', name),
      semis: this.matchesForStageAndGroup(matches, 'SEMIFINALS', name),
      finals: this.matchesForStageAndGroup(matches, 'FINALS', name)
    })).filter(g => g.quarters.length || g.semis.length || g.finals.length);
  }

  private buildLatestKnockoutTitle(matches: Match[]): string {
    const latest = this.latestGeneratedKnockoutStage(matches);
    return latest ? `${this.stageDisplay(latest)} Bracket` : 'Tournament Cup';
  }

  private buildStandingsRoundLabel(matches: Match[]): string {
    const latestCompletedKo = this.latestCompletedKnockoutStage(matches);
    const latestSrr = this.latestFinalizedSrrRound(matches);
    if (latestCompletedKo) return `${this.stageDisplay(latestCompletedKo)} results shown above. SRR standings below are after SRR Round ${latestSrr || 0}.`;
    if (latestSrr > 0) return `Standings after SRR Round ${latestSrr}`;
    return 'Standings before any finalized SRR round';
  }

  private buildSrrStandingsTitle(matches: Match[]): string {
    const latestSrr = this.latestFinalizedSrrRound(matches);
    return latestSrr > 0 ? `Standings after SRR Round ${latestSrr}` : 'SRR Standings';
  }

  private buildKnockoutResultGroups(matches: Match[]): ResultGroup[] {
    const stageOrder = ['PRE_QUARTERS', 'QUARTERS', 'SEMIFINALS', 'FINALS'];
    return stageOrder.filter(stage => this.stageCompleted(matches, stage)).reverse().map(stage => ({
      stage,
      label: this.stageDisplay(stage),
      matches: this.matchesForStage(matches, stage).filter(m => !!m.scoreFinalized),
      groups: []
    }));
  }

  private buildHistoryGroups(matches: Match[]): HistoryGroup[] {
    const groups: HistoryGroup[] = [];
    ['FINALS', 'SEMIFINALS', 'QUARTERS', 'PRE_QUARTERS'].forEach(stage => {
      const stageMatches = this.matchesForStage(matches, stage);
      if (stageMatches.length > 0) groups.push({ key: stage, label: this.stageDisplay(stage), matches: stageMatches });
    });

    const srrRounds = [...new Set(matches.filter(m => (m.roundType || 'SRR').toUpperCase() === 'SRR').map(m => m.roundNumber || 0).filter(r => r > 0))].sort((a, b) => b - a);
    srrRounds.forEach(round => groups.push({
      key: `SRR-${round}`,
      label: `SRR Round #${round}`,
      matches: matches.filter(m => (m.roundType || 'SRR').toUpperCase() === 'SRR' && (m.roundNumber || 0) === round).sort((a, b) => this.boardSort(a) - this.boardSort(b))
    }));
    return groups;
  }

  private latestGeneratedKnockoutStage(matches: Match[]): string {
    const order = ['PRE_QUARTERS', 'QUARTERS', 'SEMIFINALS', 'FINALS'];
    const generated = order.filter(stage => this.matchesForStage(matches, stage).length > 0);
    return generated.length ? generated[generated.length - 1] : '';
  }

  private latestCompletedKnockoutStage(matches: Match[]): string {
    const order = ['PRE_QUARTERS', 'QUARTERS', 'SEMIFINALS', 'FINALS'];
    const completed = order.filter(stage => this.stageCompleted(matches, stage));
    return completed.length ? completed[completed.length - 1] : '';
  }

  private stageCompleted(matches: Match[], stage: string): boolean {
    const stageMatches = this.matchesForStage(matches, stage);
    return stageMatches.length > 0 && stageMatches.every(m => !!m.scoreFinalized);
  }

  private matchesForStage(matches: Match[], stage: string): Match[] {
    return matches.filter(m => (m.roundType || '').toUpperCase() === stage).sort((a, b) => this.groupSort(a, b) || this.boardSort(a) - this.boardSort(b));
  }

  private matchesForStageAndGroup(matches: Match[], stage: string, group: string): Match[] {
    return this.matchesForStage(matches, stage).filter(m => this.normalizedGroup(m.roundGroup) === group);
  }

  private isKnockout(m: Match): boolean { return ['PRE_QUARTERS', 'QUARTERS', 'SEMIFINALS', 'FINALS'].includes((m.roundType || '').toUpperCase()); }
  private normalizedGroup(group?: string): string { return group && group.trim() ? group : 'Main'; }
  private groupSort(a: Match, b: Match): number { return this.normalizedGroup(a.roundGroup).localeCompare(this.normalizedGroup(b.roundGroup)); }
  private boardSort(m: Match): number { const n = Number(m.boardNumber); return Number.isFinite(n) ? n : 999; }

  private latestFinalizedSrrRound(matches: Match[]): number {
    const rounds = [...new Set(matches.filter(m => (m.roundType || 'SRR').toUpperCase() === 'SRR' && !!m.scoreFinalized).map(m => m.roundNumber || 0))];
    return rounds.length ? Math.max(...rounds) : 0;
  }

  matchRoundLabel(m: Match): string { return (m.roundType || 'SRR').toUpperCase() === 'SRR' ? `SRR Round #${m.roundNumber}` : this.stageDisplay(m.roundType || ''); }
  roundGroupLabel(m: Match): string { const g = this.normalizedGroup(m.roundGroup); return g === 'Main' ? '' : `${g} -`; }
  stageDisplay(stage: string): string {
    const s = (stage || '').toUpperCase();
    if (s === 'PRE_QUARTERS') return 'Pre-Quarter Finals';
    if (s === 'QUARTERS') return 'Quarter Finals';
    if (s === 'SEMIFINALS') return 'Semi Finals';
    if (s === 'FINALS') return 'Finals';
    return stage || 'Round';
  }

  winnerId(m: Match): string { return m.winnerId || ''; }
  winnerName(m: Match): string { if (m.winnerId === m.player1Id) return m.player1Name || ''; if (m.winnerId === m.player2Id) return m.player2Name || ''; return ''; }
  loserName(m: Match): string { if (m.winnerId === m.player1Id) return m.player2Name || ''; if (m.winnerId === m.player2Id) return m.player1Name || ''; return ''; }
  winnerRank(m: Match): number | undefined { if (m.winnerId === m.player1Id) return m.player1Rank; if (m.winnerId === m.player2Id) return m.player2Rank; return undefined; }
  loserRank(m: Match): number | undefined { if (m.winnerId === m.player1Id) return m.player2Rank; if (m.winnerId === m.player2Id) return m.player1Rank; return undefined; }
  winnerScore(m: Match): number { return m.winnerId === m.player1Id ? (m.player1Score || 0) : (m.player2Score || 0); }
  loserScore(m: Match): number { return m.winnerId === m.player1Id ? (m.player2Score || 0) : (m.player1Score || 0); }


  qfAll(group: BracketGroup): Match[] { return this.padMatches(group.quarters, 4, 'QF'); }
  sfAll(group: BracketGroup): Match[] { return this.padMatches(group.semis, 2, 'SF'); }
  finalMatches(group: BracketGroup): Match[] { return this.padMatches(group.finals, 1, 'FINAL'); }

  championName(group: BracketGroup): string {
    const final = group.finals && group.finals.length ? group.finals[0] : undefined;
    return final && this.winnerName(final) ? this.winnerName(final) : 'TBD';
  }

  currentKnockoutMessage(group: BracketGroup): string {
    if (group.finals && group.finals.some(m => m.scoreFinalized)) return 'Final results are available.';
    if (group.finals && group.finals.length) return 'Finals are in progress.';
    if (group.semis && group.semis.length) return 'Semi Finals are in progress.';
    return 'Quarter Finals are in progress.';
  }

  displayNameForSlot(name: string | undefined, matchIndex: number, topSlot: boolean, roundName: string): string {
    if (name && !this.isPlaceholder(name)) return name;
    if (roundName === 'SF') return topSlot ? `Winner QF ${matchIndex * 2 + 1}` : `Winner QF ${matchIndex * 2 + 2}`;
    if (roundName === 'FINAL') return topSlot ? 'Winner SF 1' : 'Winner SF 2';
    return 'Not Qualified';
  }

  scoreText(match: Match, first: boolean): string {
    if (!match || !match.scoreFinalized) return '-';
    return String(first ? (match.player1Score || 0) : (match.player2Score || 0));
  }

  isPlaceholder(name?: string): boolean {
    return !name || name.toLowerCase().includes('not qualified') || name.toLowerCase() === 'tbd';
  }

  playerAvatar(name?: string): string {
    if (this.isPlaceholder(name)) return '👤';
    const code = (name || '').trim().charCodeAt(0) || 0;
    return code % 2 === 0 ? '👨' : '👩';
  }

  playerFlag(name?: string): string {
    if (this.isPlaceholder(name)) return '⚪';
    const flags = ['🇮🇳', '🇺🇸', '🇨🇦', '🇧🇷', '🇬🇧', '🇰🇷'];
    const code = (name || '').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return flags[code % flags.length];
  }

  private padMatches(matches: Match[], count: number, stage: string): Match[] {
    const output: Match[] = [...(matches || [])];
    while (output.length < count) {
      output.push({
        tournamentId: this.tournamentId,
        format: this.format,
        player1Name: stage === 'QF' ? 'Not Qualified' : 'TBD',
        player2Name: stage === 'QF' ? 'Not Qualified' : 'TBD',
        status: 'PLACEHOLDER',
        scoreFinalized: false
      } as Match);
    }
    return output.slice(0, count);
  }

  private setTournamentName(): void {
    const selected = this.tournaments.find(t => t.id === this.tournamentId);
    this.selectedTournamentName = selected?.name || '';
  }
  isSuperAdmin(): boolean {
    return this.admin.currentPin && this.admin.currentPin() === '1123';
  }

  saveAdjustment(s: Standing) {
    if (!this.tournamentId || !this.format || !s.playerId) return;
    this.api.saveStandingAdjustment(this.tournamentId, this.format, {
      playerId: s.playerId,
      playerName: s.playerName,
      winsAdjustment: Number(s.winsAdjustment || 0),
      pointsDifferentialAdjustment: Number(s.pointsDifferentialAdjustment || 0),
      reason: s.adjustmentReason || ''
    }, '1123').subscribe({
      next: () => this.load(),
      error: err => alert(err?.error?.message || err?.error || 'Unable to save standing adjustment')
    });
  }


}
