import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Tournament, DashboardTournament } from '../../models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, NgFor, NgIf, DatePipe],
  template: `
<h2>Dashboard</h2>
<p class="muted">Welcome to CACA Inc. Tournament Management System. Players can view tournaments, register, enter scores, and view standings.</p>

<div class="dashboard-grid player-dashboard-grid">
  <a class="dash-card ocean-light" routerLink="/registrations"><b>Register For</b><span>Register for Singles, Doubles, Mixed Doubles, or Team Event.</span></a>
  <a class="dash-card yellow" routerLink="/player-score"><b>Player Score</b><span>Open your assigned board score card using registered phone number.</span></a>
  <a class="dash-card black" routerLink="/standings"><b>Standings</b><span>View current rankings, results, and knockout brackets.</span></a>
</div>

<section class="card tournament-list-card">
  <div class="section-header">
    <div>
      <h3>Current / Upcoming Tournaments</h3>
      <p class="muted">Tournaments remain here until Finals are completed and a champion is declared.</p>
    </div>
    <span class="count-pill ocean-pill">{{currentTournaments.length}}</span>
  </div>

  <div *ngIf="currentTournaments.length === 0" class="empty-state">No current or upcoming tournaments found yet.</div>

  <div class="tournament-link-list" *ngIf="currentTournaments.length > 0">
    <div class="tournament-row future" *ngFor="let item of currentTournaments">
      <a [routerLink]="standingsLink(item.tournament)" class="tournament-main-link">
        <div>
          <b>{{item.tournament.name}}</b>
          <span>{{displayFormat(item.tournament)}} • {{item.tournament.tournamentDate ? (item.tournament.tournamentDate | date:'mediumDate') : 'No date added'}} • {{item.tournament.status || 'OPEN'}}</span>
        </div>
        <em>View Standings →</em>
      </a>
    </div>
  </div>
</section>

<section class="card tournament-list-card">
  <div class="section-header">
    <div>
      <h3>Completed Tournaments</h3>
      <p class="muted">Finals completed and champion declared. Click any tournament to view final standings.</p>
    </div>
    <span class="count-pill">{{completedTournaments.length}}</span>
  </div>

  <div *ngIf="completedTournaments.length === 0" class="empty-state">No completed tournaments found yet.</div>

  <div class="tournament-link-list" *ngIf="completedTournaments.length > 0">
    <div class="tournament-row previous" *ngFor="let item of completedTournaments">
      <a [routerLink]="standingsLink(item.tournament)" class="tournament-main-link">
        <div>
          <b>{{item.tournament.name}}</b>
          <span>{{displayFormat(item.tournament)}} • {{item.tournament.tournamentDate ? (item.tournament.tournamentDate | date:'mediumDate') : 'No date added'}} • Champion: {{item.championName || 'Declared'}}</span>
        </div>
        <em>View Final Standings →</em>
      </a>
    </div>
  </div>
</section>
` })
export class DashboardComponent implements OnInit {
  tournaments: DashboardTournament[] = [];
  currentTournaments: DashboardTournament[] = [];
  completedTournaments: DashboardTournament[] = [];

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.dashboardTournaments().subscribe(tournaments => {
      this.tournaments = tournaments || [];
      this.splitTournaments();
    });
  }

  private splitTournaments(): void {
    this.completedTournaments = this.tournaments
      .filter(item => item.championDeclared)
      .sort((a, b) => this.dateValue(b.tournament) - this.dateValue(a.tournament));

    this.currentTournaments = this.tournaments
      .filter(item => !item.championDeclared)
      .sort((a, b) => this.dateValue(a.tournament) - this.dateValue(b.tournament));
  }

  private dateValue(t: Tournament): number {
    return t.tournamentDate ? new Date(t.tournamentDate).getTime() : Number.MAX_SAFE_INTEGER;
  }

  displayFormat(t: Tournament): string {
    return t.tournamentType || (t.formats && t.formats.length ? t.formats[0] : 'Singles');
  }

  standingsLink(t: Tournament): any[] {
    return ['/standings', t.id || '', this.displayFormat(t)];
  }
}
