
import { Component, Input } from '@angular/core';

export type BracketPlayer = {
  rank?: number;
  name: string;
  score?: number;
  winner?: boolean;
  notQualified?: boolean;
};

export type BracketMatch = {
  id?: string;
  left?: BracketPlayer;
  right?: BracketPlayer;
};

export type KnockoutDivisionView = {
  divisionName: string;
  quarterFinals: BracketMatch[];
  semiFinals: BracketMatch[];
  finalMatch?: BracketMatch;
  champion?: BracketPlayer;
};

@Component({
  selector: 'app-standings-knockout-view',
  templateUrl: './standings-knockout-view.component.html',
  styleUrls: ['./standings-knockout-view.component.css']
})
export class StandingsKnockoutViewComponent {
  @Input() title = 'Knockout Rounds';
  @Input() subtitle = 'Quarterfinal • Semifinal • Final';
  @Input() divisions: KnockoutDivisionView[] = [];

  // Demo fallback helps page render even when backend data is not loaded yet.
  demoDivisions: KnockoutDivisionView[] = [
    {
      divisionName: 'Champions',
      quarterFinals: [
        { left: { rank: 1, name: 'Team 1', score: 0 }, right: { rank: 8, name: 'Not Qualified', score: 0, notQualified: true } },
        { left: { rank: 4, name: 'Team 4', score: 0 }, right: { rank: 5, name: 'Team 5', score: 0 } },
        { left: { rank: 2, name: 'Team 2', score: 0 }, right: { rank: 7, name: 'Not Qualified', score: 0, notQualified: true } },
        { left: { rank: 3, name: 'Team 3', score: 0 }, right: { rank: 6, name: 'Not Qualified', score: 0, notQualified: true } }
      ],
      semiFinals: [
        { left: { rank: 1, name: 'TBD', score: 0 }, right: { rank: 4, name: 'TBD', score: 0 } },
        { left: { rank: 2, name: 'TBD', score: 0 }, right: { rank: 3, name: 'TBD', score: 0 } }
      ],
      finalMatch: {
        left: { name: 'TBD', score: 0 },
        right: { name: 'TBD', score: 0 }
      },
      champion: { name: 'TBD' }
    }
  ];

  get visibleDivisions(): KnockoutDivisionView[] {
    return this.divisions && this.divisions.length ? this.normalizeDivisions(this.divisions) : this.demoDivisions;
  }

  normalizeDivisions(divisions: KnockoutDivisionView[]): KnockoutDivisionView[] {
    return divisions.map(d => ({
      ...d,
      quarterFinals: this.padMatches(d.quarterFinals, 4),
      semiFinals: this.padMatches(d.semiFinals, 2),
      finalMatch: d.finalMatch || { left: { name: 'TBD' }, right: { name: 'TBD' } },
      champion: d.champion || { name: 'TBD' }
    }));
  }

  padMatches(matches: BracketMatch[] | undefined, count: number): BracketMatch[] {
    const output: BracketMatch[] = [...(matches || [])];
    while (output.length < count) {
      output.push({
        left: { name: 'Not Qualified', notQualified: true, score: 0 },
        right: { name: 'Not Qualified', notQualified: true, score: 0 }
      });
    }
    return output.slice(0, count);
  }

  playerLabel(player?: BracketPlayer): string {
    if (!player) return 'TBD';
    const rank = player.rank ? `#${player.rank} ` : '';
    return `${rank}${player.name || 'TBD'}`;
  }

  score(player?: BracketPlayer): string {
    if (player?.score === undefined || player?.score === null) return '';
    return `${player.score}`;
  }
}
