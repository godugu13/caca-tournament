
import { Component, Input } from '@angular/core';

type BracketEntry = {
  rank?: number;
  name: string;
  seed?: number;
};

type DivisionBracket = {
  divisionName: string;
  quarterFinals: Array<{ left: BracketEntry; right: BracketEntry; winner?: BracketEntry }>;
  semiFinals: Array<{ left?: BracketEntry; right?: BracketEntry; winner?: BracketEntry }>;
  finalMatch?: { left?: BracketEntry; right?: BracketEntry; winner?: BracketEntry };
};

@Component({
  selector: 'app-knockout-brackets',
  templateUrl: './knockout-brackets.component.html',
  styleUrls: ['./knockout-brackets.component.css']
})
export class KnockoutBracketsComponent {
  @Input() title = 'Knockout Rounds';
  @Input() divisions: DivisionBracket[] = [];

  // For testing/demo if parent does not pass data yet.
  demoDivisions: DivisionBracket[] = [
    {
      divisionName: 'Champions',
      quarterFinals: [
        { left: { rank: 1, name: 'Rank 1' }, right: { rank: 8, name: 'Rank 8' } },
        { left: { rank: 4, name: 'Rank 4' }, right: { rank: 5, name: 'Rank 5' } },
        { left: { rank: 2, name: 'Rank 2' }, right: { rank: 7, name: 'Rank 7' } },
        { left: { rank: 3, name: 'Rank 3' }, right: { rank: 6, name: 'Rank 6' } }
      ],
      semiFinals: [{}, {}],
      finalMatch: {}
    }
  ];

  get visibleDivisions(): DivisionBracket[] {
    return this.divisions && this.divisions.length ? this.divisions : this.demoDivisions;
  }

  display(entry?: BracketEntry): string {
    if (!entry) return 'TBD';
    return entry.rank ? `Rank ${entry.rank}: ${entry.name}` : entry.name;
  }
}
