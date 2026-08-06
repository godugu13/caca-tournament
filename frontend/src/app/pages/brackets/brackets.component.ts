import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Match, Tournament } from '../../models/models';

@Component({
  selector: 'app-brackets',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf],
  template: `
<section class="public-brackets-page">
  <h2 class="compact-page-title" *ngIf="selectedTournamentName">{{selectedTournamentName}} • {{format}} • Brackets</h2>

  <div class="card form inline compact-filter-bar">
    <select [(ngModel)]="tournamentId" (change)="onTournamentChange()">
      <option value="">Select Tournament</option>
      <option *ngFor="let t of tournaments" [value]="t.id">{{t.name}}</option>
    </select>
    <select [(ngModel)]="format" (change)="load()">
      <option *ngFor="let f of availableFormats" [value]="f">{{f}}</option>
    </select>
    <button type="button" (click)="load()" [disabled]="!tournamentId">Show</button>
  </div>

  <p class="muted" *ngIf="!matches.length && tournamentId">No rounds generated yet.</p>

  <div *ngIf="matches.length" class="card public-round-tabs-card">
    <button type="button"
            class="round-tab-button"
            *ngFor="let tab of publicTabs()"
            [class.active-round-button]="selectedTab === tab.key"
            (click)="selectedTab = tab.key">
      {{tab.label}}
    </button>
  </div>

  <div class="gameday-knockout-bracket public-bracket-display" *ngIf="selectedTab === 'KO' && hasKnockoutBracket()">
    <div class="bracket-heading-row">
      <div>
        <h3>Knockout Bracket</h3>
        <p>Quarterfinals → Semifinals → Finals</p>
      </div>
    </div>

    <div class="bracket-board">
      <section class="bracket-column qf-column" [class.current-round]="activeKnockoutStage()==='QUARTERS'" [class.locked-round]="!knockoutMatchesForStage('QUARTERS').length">
        <h4>Quarterfinals <span>Venue #1 - #4</span></h4>
        <div class="bracket-row" *ngFor="let m of knockoutMatchesForStage('QUARTERS'); let i=index">
          <div class="round-code">QF {{i+1}}</div>
          <div class="bracket-card" [class.active-card]="activeKnockoutStage()==='QUARTERS'">
            <span class="venue-pill">Venue #{{m.boardNumber || (i+1)}}</span>
            <div class="player-line"><b>{{m.player1Rank || '-'}}</b> {{m.player1Name}} <span>{{scoreOrDash(m.player1Score, m.scoreFinalized)}}</span></div>
            <div class="player-line" *ngIf="m.status !== 'BYE'"><b>{{m.player2Rank || '-'}}</b> {{m.player2Name}} <span>{{scoreOrDash(m.player2Score, m.scoreFinalized)}}</span></div>
            <div class="bye-line" *ngIf="m.status === 'BYE'">BYE - advances</div>
            <small *ngIf="m.scoreFinalized && winnerName(m)">Winner: {{winnerName(m)}}</small>
          </div>
        </div>
      </section>

      <section class="bracket-column sf-column" [class.current-round]="activeKnockoutStage()==='SEMIFINALS'" [class.locked-round]="!knockoutMatchesForStage('SEMIFINALS').length">
        <h4>Semifinals <span>Venue #5 - #6</span></h4>
        <div class="bracket-row" *ngFor="let m of knockoutMatchesForStage('SEMIFINALS'); let i=index">
          <div class="round-code">SF {{i+1}}</div>
          <div class="bracket-card" [class.active-card]="activeKnockoutStage()==='SEMIFINALS'">
            <span class="venue-pill">Venue #{{m.boardNumber || (i+5)}}</span>
            <div class="player-line">{{m.player1Name || ('Winner QF ' + ((i*2)+1))}} <span>{{scoreOrDash(m.player1Score, m.scoreFinalized)}}</span></div>
            <div class="player-line" *ngIf="m.status !== 'BYE'">{{m.player2Name || ('Winner QF ' + ((i*2)+2))}} <span>{{scoreOrDash(m.player2Score, m.scoreFinalized)}}</span></div>
            <small *ngIf="m.scoreFinalized && winnerName(m)">Winner: {{winnerName(m)}}</small>
          </div>
        </div>
        <div class="bracket-placeholder" *ngIf="!knockoutMatchesForStage('SEMIFINALS').length">Semis open after Quarters</div>
      </section>

      <section class="bracket-column final-column" [class.current-round]="activeKnockoutStage()==='FINALS'" [class.locked-round]="!knockoutMatchesForStage('FINALS').length">
        <h4>Finals <span>Venue #7</span></h4>
        <div class="bracket-row" *ngFor="let m of knockoutMatchesForStage('FINALS'); let i=index">
          <div class="round-code">F</div>
          <div class="bracket-card final-card" [class.active-card]="activeKnockoutStage()==='FINALS'">
            <span class="venue-pill">Venue #{{m.boardNumber || 7}}</span>
            <div class="player-line">{{m.player1Name || 'Winner SF 1'}} <span>{{scoreOrDash(m.player1Score, m.scoreFinalized)}}</span></div>
            <div class="player-line" *ngIf="m.status !== 'BYE'">{{m.player2Name || 'Winner SF 2'}} <span>{{scoreOrDash(m.player2Score, m.scoreFinalized)}}</span></div>
            <div class="champion-display" *ngIf="m.scoreFinalized && winnerName(m)">
              <strong>🏆 Champion</strong>
              <b>{{winnerName(m)}}</b>
              <small *ngIf="runnerUpName(m)">Runner-up: {{runnerUpName(m)}}</small>
            </div>
          </div>
        </div>
        <div class="bracket-placeholder" *ngIf="!knockoutMatchesForStage('FINALS').length">Final opens after Semis</div>
      </section>
    </div>
  </div>

  <div class="card" *ngIf="selectedTab !== 'KO' && selectedRoundMatches().length">
    <h3>{{selectedTabLabel()}}</h3>
    <div class="match-grid">
      <div class="match-card public-match-card" *ngFor="let m of selectedRoundMatches()">
        <b>{{ m.status === 'BYE' ? 'BYE' : 'Venue #' + m.boardNumber }}</b>
        <p>Rank {{m.player1Rank || '-'}}: {{m.player1Name}} <b *ngIf="m.scoreFinalized">{{m.player1Score || 0}}</b></p>
        <ng-container *ngIf="m.status !== 'BYE'; else byeBlock">
          <p>vs</p>
          <p>Rank {{m.player2Rank || '-'}}: {{m.player2Name}} <b *ngIf="m.scoreFinalized">{{m.player2Score || 0}}</b></p>
        </ng-container>
        <ng-template #byeBlock><p class="ok">BYE - advances automatically</p></ng-template>
        <small *ngIf="m.scoreFinalized && winnerName(m)">Winner: {{winnerName(m)}}</small>
        <small *ngIf="!m.scoreFinalized">In progress / scheduled</small>
      </div>
    </div>
  </div>
</section>
`
})
export class BracketsComponent implements OnInit {
  tournaments: Tournament[] = [];
  matches: Match[] = [];
  tournamentId = '';
  format = 'Singles';
  availableFormats: string[] = ['Singles'];
  selectedTournamentName = '';
  selectedTab = '';

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.tournamentId = this.route.snapshot.paramMap.get('tournamentId') || this.route.snapshot.queryParamMap.get('tournamentId') || '';
    this.format = this.route.snapshot.paramMap.get('format') || this.route.snapshot.queryParamMap.get('format') || 'Singles';

    this.api.tournaments().subscribe(tournaments => {
      this.tournaments = tournaments || [];
      if (!this.tournamentId && this.tournaments.length) this.tournamentId = this.tournaments[0].id || '';
      this.syncTournament();
      if (this.tournamentId) this.load();
    });
  }

  onTournamentChange() {
    this.syncTournament();
    this.load();
  }

  syncTournament() {
    const t = this.tournaments.find(x => x.id === this.tournamentId);
    this.selectedTournamentName = t?.name || '';
    this.availableFormats = t?.formats?.length ? t.formats : [t?.tournamentType || this.format || 'Singles'];
    if (!this.availableFormats.includes(this.format)) this.format = this.availableFormats[0] || 'Singles';
  }

  load() {
    if (!this.tournamentId || !this.format) return;
    this.syncTournament();
    this.api.matches(this.tournamentId, this.format).subscribe(matches => {
      this.matches = matches || [];
      this.selectedTab = this.defaultTab();
    });
  }

  publicTabs() {
    const srrTabs = [...new Set(this.matches
      .filter((m:any) => (m.roundType || 'SRR').toUpperCase() === 'SRR')
      .map((m:any) => Number(m.roundNumber || 0))
      .filter((r:number) => r > 0))]
      .sort((a:number, b:number) => a - b)
      .map((r:number) => ({key: `SRR-${r}`, label: `SRR ${r}`}));

    const latestFirst = [...srrTabs].reverse();
    return this.hasKnockoutBracket()
      ? [{key: 'KO', label: 'Knockout Bracket'}, ...latestFirst]
      : latestFirst;
  }

  defaultTab() {
    if (this.hasKnockoutBracket()) return 'KO';
    const rounds = this.publicTabs().filter(t => t.key.startsWith('SRR-'));
    return rounds.length ? rounds[rounds.length - 1].key : '';
  }

  selectedTabLabel() {
    return this.publicTabs().find(t => t.key === this.selectedTab)?.label || 'Matchups';
  }

  selectedRoundMatches() {
    if (!this.selectedTab || this.selectedTab === 'KO') return [];
    if (this.selectedTab.startsWith('SRR-')) {
      const round = Number(this.selectedTab.replace('SRR-', ''));
      return this.matches
        .filter((m:any) => (m.roundType || 'SRR').toUpperCase() === 'SRR' && Number(m.roundNumber || 0) === round)
        .sort((a:any, b:any) => Number(a.boardNumber || 999) - Number(b.boardNumber || 999));
    }
    return [];
  }

  knockoutMatches() {
    return this.matches.filter((m:any) => ['QUARTERS', 'SEMIFINALS', 'FINALS'].includes(m.roundType || ''));
  }

  hasKnockoutBracket() {
    return this.knockoutMatches().length > 0;
  }

  knockoutMatchesForStage(stage: string) {
    return this.matches
      .filter((m:any) => m.roundType === stage)
      .sort((a:any, b:any) => Number(a.boardNumber || 999) - Number(b.boardNumber || 999));
  }

  activeKnockoutStage() {
    const order = ['QUARTERS', 'SEMIFINALS', 'FINALS'];
    const generated = order.filter(stage => this.knockoutMatchesForStage(stage).length > 0);
    return generated.length ? generated[generated.length - 1] : '';
  }

  winnerName(m: Match) {
    if (!m || !m.winnerId) return '';
    if (m.winnerId === m.player1Id) return m.player1Name || '';
    if (m.winnerId === m.player2Id) return m.player2Name || '';
    return '';
  }

  runnerUpName(m: Match) {
    if (!m || !m.winnerId) return '';
    if (m.winnerId === m.player1Id) return m.player2Name || '';
    if (m.winnerId === m.player2Id) return m.player1Name || '';
    return '';
  }

  scoreOrDash(score: any, finalized: any) {
    return finalized ? (score ?? 0) : '-';
  }
}
