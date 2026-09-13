import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { Tournament } from '../../models/models';

@Component({
  selector: 'app-live',
  standalone: true,
  imports: [NgFor, NgIf, DatePipe],
  template: `
<section class="live-page">
  <h2>Tournament Day - Live</h2>
  <p class="muted">Live links appear here after SRR Round 1 has been generated.</p>

  <div *ngIf="liveTournaments.length === 0" class="card empty-state">
    No active tournament live stream is available.
  </div>

  <div class="live-tournament-grid">
    <article class="card live-tournament-card" *ngFor="let t of liveTournaments">
      <div>
        <h3>{{t.name}}</h3>
        <p>{{(t.formats || []).join(', ')}}</p>
        <small>{{t.tournamentDate ? (t.tournamentDate | date:'mediumDate') : 'Date TBD'}}</small>
      </div>
      <a class="live-watch-button" [href]="t.liveUrl" target="_blank" rel="noopener">🔴 Watch Live</a>
    </article>
  </div>
</section>
`
})
export class LiveComponent implements OnInit {
  liveTournaments: Tournament[] = [];
  constructor(private api: ApiService) {}
  ngOnInit(): void {
    this.api.dashboardTournaments().subscribe(items => {
      this.liveTournaments = (items || [])
        .filter(i => !!i.srrStarted)
        .map(i => i.tournament)
        .filter(t => !!t.liveUrl && (t.status || '').toUpperCase() !== 'COMPLETED');
    });
  }
}
