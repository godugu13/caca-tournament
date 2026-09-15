import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AdminAccessService } from '../../services/admin-access.service';
import { Tournament, DashboardTournament, PublicRegistration } from '../../models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, NgFor, NgIf, DatePipe],
  template: `
<h2>Dashboard</h2>
<div class="card" *ngIf="dashboardError">
  <b>Unable to load tournament data.</b>
  <span class="muted"> {{dashboardError}}</span>
</div>

<div class="dashboard-grid player-dashboard-grid">
  <a class="dash-card ocean-light" routerLink="/registrations"><b>Register For</b><span>Register for an upcoming tournament.</span></a>
  <a class="dash-card yellow" routerLink="/player-score"><b>Player Score</b><span>Open your assigned score card.</span></a>
  <a class="dash-card black" routerLink="/brackets"><b>Brackets</b><span>View live and completed matchups.</span></a>
  <a class="dash-card ocean-light" routerLink="/standings"><b>Standings</b><span>View rankings and round results.</span></a>
  <a *ngIf="hasStartedLiveTournament()" class="dash-card live-card" routerLink="/live"><b>🔴 Tournament Day - Live</b><span>Open CACA live tournament streams.</span></a>
</div>

<section class="card super-admin-dashboard-tools" *ngIf="isSuperAdmin()">
  <h3>Super Admin Tools</h3>
  <div class="dashboard-admin-links">
    <a routerLink="/tournaments">Manage Tournaments</a>
    <a routerLink="/gameday">Game Day</a>
    <a routerLink="/scores">Scores</a>
    <a routerLink="/audit-history">Audit History</a>
  </div>
</section>

<section class="card tournament-list-card">
  <div class="section-header">
    <div>
      <h3>Current / Upcoming Tournaments</h3>
      <p class="muted">The next upcoming tournament is shown first.</p>
    </div>
    <span class="count-pill ocean-pill">{{currentTournaments.length}}</span>
  </div>

  <div *ngIf="currentTournaments.length === 0" class="empty-state">No current or upcoming tournaments found yet.</div>

  <div class="tournament-link-list" *ngIf="currentTournaments.length > 0">
    <article class="tournament-row future dashboard-tournament-card" *ngFor="let item of currentTournaments">
      <img *ngIf="item.tournament.flyerUrl" class="dashboard-flyer" [src]="item.tournament.flyerUrl" alt="Tournament flyer">

      <div class="dashboard-tournament-content">
        <a [routerLink]="['/registrations']"
           [queryParams]="{tournamentId:item.tournament.id, format:displayFormat(item.tournament)}"
           class="tournament-main-link">
          <div>
            <b>{{item.tournament.name}}</b>
            <span>{{displayFormat(item.tournament)}} • {{item.tournament.tournamentDate ? (item.tournament.tournamentDate | date:'mediumDate') : 'Date TBD'}}</span>
          </div>
          <em>Register →</em>
        </a>

        <div class="dashboard-row-actions">
          <button type="button" class="secondary small" (click)="toggleRegisteredPlayers(item.tournament)">
            {{playersOpen[item.tournament.id || ''] ? 'Hide Players' : 'Registered Players'}}
          </button>
          <a *ngIf="canEditTournament(item.tournament)" class="secondary small dashboard-edit-link"
             [routerLink]="['/tournaments']" [queryParams]="{editTournamentId:item.tournament.id}">Edit Tournament</a>
          <a *ngIf="item.srrStarted && item.tournament.liveUrl" class="live-link-small" [href]="item.tournament.liveUrl" target="_blank" rel="noopener">🔴 Live</a>
        </div>

        <div class="dashboard-player-list" *ngIf="playersOpen[item.tournament.id || '']">
          <span *ngIf="playersLoading[item.tournament.id || '']">Loading players…</span>
          <span *ngIf="!playersLoading[item.tournament.id || ''] && !(registeredPlayers[item.tournament.id || ''] || []).length">No registrations yet.</span>
          <div class="dashboard-team-buttons" *ngIf="!playersLoading[item.tournament.id || '']">
            <button type="button" class="dashboard-team-button"
                    *ngFor="let team of registeredTeams(item.tournament.id || ''); let i=index">
              <span class="team-number">{{i+1}}</span>
              <b>{{team.player1}}</b>
              <span class="team-separator"> + </span>
              <b>{{team.player2}}</b>
            </button>
          </div>
        </div>
      </div>
    </article>
  </div>
</section>

<section class="card tournament-list-card">
  <div class="section-header">
    <div>
      <h3>Completed Tournaments</h3>
      <p class="muted">Open a completed tournament to see final results and brackets.</p>
    </div>
    <span class="count-pill">{{completedTournaments.length}}</span>
  </div>

  <div *ngIf="completedTournaments.length === 0" class="empty-state">No completed tournaments found yet.</div>

  <div class="completed-results-grid" *ngIf="completedTournaments.length > 0">
    <article class="completed-result-card" *ngFor="let item of completedTournaments">
      <div>
        <b>{{item.tournament.name}}</b>
        <span>{{displayFormat(item.tournament)}} • {{item.tournament.tournamentDate ? (item.tournament.tournamentDate | date:'mediumDate') : 'Date not set'}}</span>
      </div>
      <div class="champion-dashboard-badge" *ngIf="item.championName">🏆 {{item.championName}}</div>
      <div class="dashboard-row-actions">
        <a [routerLink]="bracketsLink(item.tournament)" class="results-button">View Results</a>
        <a *ngIf="canEditTournament(item.tournament)" class="secondary small dashboard-edit-link"
           [routerLink]="['/tournaments']" [queryParams]="{editTournamentId:item.tournament.id}">Edit Tournament</a>
      </div>
    </article>
  </div>
</section>
` })
export class DashboardComponent implements OnInit {
  tournaments: DashboardTournament[] = [];
  currentTournaments: DashboardTournament[] = [];
  completedTournaments: DashboardTournament[] = [];
  registeredPlayers: {[tournamentId: string]: PublicRegistration[]} = {};
  playersOpen: {[tournamentId: string]: boolean} = {};
  playersLoading: {[tournamentId: string]: boolean} = {};
  editableTournamentIds = new Set<string>();
  dashboardError = '';

  constructor(private api: ApiService, private admin: AdminAccessService) {}

  ngOnInit(): void {
    this.load();
    this.loadEditableTournaments();
  }
  isSuperAdmin(): boolean { return this.admin.isSuperAdmin(); }
  canEditTournament(t: Tournament): boolean {
    if (!this.admin.isAdmin() || !t.id) return false;
    return this.admin.isSuperAdmin() || this.editableTournamentIds.has(t.id);
  }
  private loadEditableTournaments(): void {
    if (!this.admin.isAdmin()) return;
    this.api.tournamentsByPin(this.admin.currentPin()).subscribe({
      next: tournaments => this.editableTournamentIds = new Set((tournaments || []).map(t => t.id || '').filter(Boolean)),
      error: () => this.editableTournamentIds = new Set<string>()
    });
  }

  load(): void {
    this.dashboardError = '';

    // Fast path: Dashboard visibility comes directly from the tournament collection.
    // Match/result metadata is optional enrichment and must never block the tournament list.
    this.api.tournaments().subscribe({
      next: tournaments => {
        const visible = (tournaments || []).filter(t => !t.hiddenFromDashboard);
        this.tournaments = visible.map(t => ({
          tournament: t,
          championDeclared: (t.status || '').toUpperCase() === 'COMPLETED',
          championName: undefined,
          championFormat: undefined,
          srrStarted: false
        }));
        this.splitTournaments();
        this.preloadCurrentPlayers();

        // Secondary enrichment only. If it is slow or fails, the lists above remain visible.
        this.api.dashboardTournaments().subscribe({
          next: metadata => this.mergeDashboardMetadata(metadata || []),
          error: () => {}
        });
      },
      error: (err: any) => {
        this.tournaments = [];
        this.currentTournaments = [];
        this.completedTournaments = [];
        this.dashboardError = err?.error?.message || err?.message || 'Unable to load tournaments from the backend.';
      }
    });
  }

  private mergeDashboardMetadata(metadata: DashboardTournament[]): void {
    if (!metadata.length) return;
    const byId = new Map<string, DashboardTournament>();
    metadata.forEach(item => {
      const id = item?.tournament?.id || '';
      if (id) byId.set(id, item);
    });

    this.tournaments = this.tournaments.map(item => {
      const id = item.tournament.id || '';
      const enriched = byId.get(id);
      return enriched ? {...item, ...enriched, tournament: {...item.tournament, ...enriched.tournament}} : item;
    });
    this.splitTournaments();
  }

  private preloadCurrentPlayers(): void {
    const item = this.currentTournaments.find(x =>
      (x.tournament.name || '').toLowerCase().includes('caca 9th rolling trophy')
    );
    const t = item?.tournament;
    const id = t?.id || '';
    if (!id || Object.prototype.hasOwnProperty.call(this.registeredPlayers, id)) return;

    try {
      const cached = localStorage.getItem('caca.currentRollingTrophy.publicPlayers');
      if (cached) {
        const players = JSON.parse(cached);
        if (Array.isArray(players) && players.length) {
          this.registeredPlayers[id] = players;
        }
      }
    } catch {}

    this.playersLoading[id] = !Object.prototype.hasOwnProperty.call(this.registeredPlayers, id);
    this.api.currentPublicRegistrationNames().subscribe({
      next: players => {
        this.registeredPlayers[id] = players || [];
        this.playersLoading[id] = false;
        try {
          localStorage.setItem('caca.currentRollingTrophy.publicPlayers', JSON.stringify(players || []));
        } catch {}
      },
      error: () => {
        this.playersLoading[id] = false;
        if (!Object.prototype.hasOwnProperty.call(this.registeredPlayers, id)) {
          this.registeredPlayers[id] = [];
        }
      }
    });
  }

  toggleRegisteredPlayers(t: Tournament): void {
    const id = t.id || '';
    if (!id) return;
    this.playersOpen[id] = !this.playersOpen[id];
    if (!this.playersOpen[id] || this.registeredPlayers[id]) return;
    this.playersLoading[id] = true;
    const isCurrentRollingTrophy = (t.name || '').toLowerCase().includes('caca 9th rolling trophy');
    const request = isCurrentRollingTrophy
      ? this.api.currentPublicRegistrationNames()
      : this.api.publicRegistrationNames(id);

    request.subscribe({
      next: players => {
        this.registeredPlayers[id] = players || [];
        this.playersLoading[id] = false;
        if (isCurrentRollingTrophy) {
          try {
            localStorage.setItem('caca.currentRollingTrophy.publicPlayers', JSON.stringify(players || []));
          } catch {}
        }
      },
      error: () => {
        this.registeredPlayers[id] = [];
        this.playersLoading[id] = false;
      }
    });
  }

  registeredTeams(tournamentId: string): {player1: string; player2: string}[] {
    const players = this.registeredPlayers[tournamentId] || [];
    const teams: {player1: string; player2: string}[] = [];
    const seen = new Set<string>();

    for (const registration of players) {
      const player1 = String(registration.playerName || '').trim();
      const player2 = String(registration.partnerName || '').trim();

      if (!player1) continue;

      // Dashboard is team-oriented for Doubles. If the same team was entered
      // from both partners, normalize A+B and B+A to one team button.
      const normalized1 = player1.toLowerCase();
      const normalized2 = player2.toLowerCase();
      const key = player2
        ? [normalized1, normalized2].sort().join('||')
        : `single||${normalized1}`;

      if (seen.has(key)) continue;
      seen.add(key);

      teams.push({
        player1,
        player2: player2 || 'TBD'
      });
    }

    return teams;
  }

  private splitTournaments(): void {
    this.completedTournaments = this.tournaments
      .filter(item => item.championDeclared || (item.tournament.status || '').toUpperCase() === 'COMPLETED')
      .sort((a, b) => this.dateValue(b.tournament, 0) - this.dateValue(a.tournament, 0));

    this.currentTournaments = this.tournaments
      .filter(item => !item.championDeclared && (item.tournament.status || '').toUpperCase() !== 'COMPLETED')
      .sort((a, b) => this.currentSortValue(a.tournament) - this.currentSortValue(b.tournament));
  }

  private currentSortValue(t: Tournament): number {
    if (!t.tournamentDate) return Number.MAX_SAFE_INTEGER - 1;
    const d = new Date(`${t.tournamentDate}T00:00:00`).getTime();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (d >= today) return d - today;
    // Past-but-open tournaments appear after future tournaments, newest past first.
    return 10_000_000_000_000 + (today - d);
  }

  private dateValue(t: Tournament, fallback: number): number {
    return t.tournamentDate ? new Date(`${t.tournamentDate}T00:00:00`).getTime() : fallback;
  }

  displayFormat(t: Tournament): string {
    return t.tournamentType || (t.formats && t.formats.length ? t.formats[0] : 'Singles');
  }

  bracketsLink(t: Tournament): any[] { return ['/brackets', t.id || '', this.displayFormat(t)]; }
  hasStartedLiveTournament(): boolean {
    return this.tournaments.some(item =>
      !!item.srrStarted &&
      !!item.tournament.liveUrl &&
      (item.tournament.status || '').toUpperCase() !== 'COMPLETED'
    );
  }

}
