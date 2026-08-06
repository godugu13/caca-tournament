import { Component, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NgFor, NgIf } from "@angular/common";
import { Router } from "@angular/router";
import { ApiService } from "../../services/api.service";
import { AdminAccessService } from '../../services/admin-access.service';
import { Match, Registration, Tournament } from "../../models/models";
import { AppConfigService } from "../../services/app-config.service";

@Component({
  selector: "app-gameday",
  standalone: true,
  imports: [FormsModule, NgFor, NgIf],
  template: `
    <div class="card gameday-compact-toolbar">
      <label>Tournament</label>
      <select [(ngModel)]="selectedTournamentId" (change)="onTournamentChange()">
        <option value="">Select Tournament</option>
        <option *ngFor="let t of tournaments" [value]="t.id">{{ t.name }}</option>
      </select>

      <label>Format</label>
      <span class="readonly-format compact-format">{{format}}</span>
    </div>

    <ng-container *ngIf="selectedTournamentId">

      <div *ngIf="matches.length" class="card gameday-round-tabs-card">
        <button
          type="button"
          class="round-tab-button"
          *ngFor="let tab of gamedayRoundTabs()"
          [class.active-round-button]="selectedGameDayTab === tab.key"
          (click)="selectGameDayTab(tab.key)"
        >
          {{tab.label}}
        </button>
      </div>
      <div class="card" *ngIf="selectedGameDayTab === 'KO'">
        <h3 class="admin-only-small-title">Knockout Controls</h3>
        <div class="ko-flow knockout-actions">
          <button
            type="button"
            [disabled]="!canGenerateKnockout('QUARTERS')"
            (click)="generateKnockout('QUARTERS')"
          >
            Generate Quarters
          </button>
          <button
            type="button"
            [disabled]="!canGenerateKnockout('SEMIFINALS')"
            (click)="generateKnockout('SEMIFINALS')"
          >
            Generate Semis
          </button>
          <button
            type="button"
            [disabled]="!canGenerateKnockout('FINALS')"
            (click)="generateKnockout('FINALS')"
          >
            Generate Finals
          </button>
        </div>
        <div class="gameday-knockout-bracket" *ngIf="hasKnockoutBracket()">
          <div class="bracket-heading-row">
            <div>
              <h3>Knockout Bracket</h3>
              <p>Quarterfinals → Semifinals → Finals</p>
            </div>
            <button type="button" class="black-btn" (click)="goToScores()">Enter / View Scores</button>
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
      </div>

      <div *ngIf="matches.length && selectedGameDayTab !== 'KO'" class="card gameday-current-card">
        <div class="section-header">
          <div>
            <h3>Matchups</h3>
            <p class="muted">
              <b>{{ selectedTournament()?.name }}</b> - {{ format }}
            </p>
          </div>
          <span class="count-pill ocean-pill">{{ activeRoundLabel() }}</span>
        </div>

        <div class="round-toolbar">
          <b>Showing: {{ activeRoundLabel() }}</b>
          <button
            type="button"
            class="secondary"
            *ngIf="previousBracketGroups().length"
            (click)="showPreviousRounds = !showPreviousRounds"
          >
            {{
              showPreviousRounds
                ? "Hide Completed Brackets"
                : "View Completed Brackets"
            }}
          </button>
        </div>

        <div *ngIf="showPreviousRounds" class="previous-tabs">
          <button
            type="button"
            class="secondary small"
            *ngFor="let group of previousBracketGroups()"
            (click)="selectHistoryGroup(group.key)"
          >
            {{ group.label }}
          </button>
        </div>

        <div class="match-grid">
          <div class="match-card" *ngFor="let m of selectedGameDayMatches()">
            <b
              >{{ matchRoundLabel(m) }} -
              {{ m.status === "BYE" ? "BYE" : "Venue #" + m.boardNumber }}</b
            >
            <p>Rank {{ m.player1Rank || "-" }}: {{ m.player1Name }}</p>
            <ng-container *ngIf="m.status !== 'BYE'; else byeBlock">
              <p>vs</p>
              <p>Rank {{ m.player2Rank || "-" }}: {{ m.player2Name }}</p>
            </ng-container>
            <ng-template #byeBlock
              ><p class="ok">BYE - no opponent this round</p></ng-template
            >
            <small></small>
          </div>
        </div>
      </div>

      <div *ngIf="!matches.length" class="card">
        <div class="section-header">
          <div>
            <h3>Attendance</h3>
            <p class="muted">
              Select registered players/teams who are present for
              <b>{{ selectedTournament()?.name }}</b> - <b>{{ format }}</b
              >.
            </p>
          </div>
          <span class="count-pill">{{ players.length }} Registered</span>
        </div>
        <div *ngIf="players.length">
          <button type="button" class="secondary" (click)="selectAll(true)">
            Select All
          </button>
          <button type="button" class="secondary" (click)="selectAll(false)">
            Clear All
          </button>
          <div class="check-row" *ngFor="let p of players">
            <input
              type="checkbox"
              [(ngModel)]="p.attended"
              (change)="saveAttendance(p)"
            />
            <span
              >{{ displayRegistration(p) }}
              <small>({{ p.format }})</small></span
            >
            <button
              type="button"
              class="danger small"
              (click)="requestDanger('registration', p)"
            >
              Withdraw
            </button>
          </div>
        </div>
        <p *ngIf="!players.length" class="muted">
          No registered players found for this tournament/format.
        </p>
      </div>

      <div *ngIf="!matches.length" class="card form">
        <h3>Upload Roster</h3>
        <p class="muted">
          Upload roster for <b>{{ selectedTournament()?.name }}</b> -
          <b>{{ format }}</b
          >.
        </p>
        <p class="muted">
          Supported: .csv, .txt, .xlsx. Columns: Name, Partner Name, Email,
          Phone.
        </p>
        <input
          type="file"
          accept=".csv,.txt,.xlsx,.xls"
          (change)="onRosterFileSelected($event)"
        />
        <button type="button" [disabled]="!rosterFile" (click)="uploadRoster()">
          Upload Roster
        </button>
        <span *ngIf="rosterMessage" class="ok">{{ rosterMessage }}</span>
      </div>

      <div *ngIf="!matches.length" class="card">
        <h3>Matchups</h3>
        <p class="muted">
          No matchups generated yet. Confirm attendance, then generate SRR Round
          #1.
        </p>
      </div>

      <div class="card compact-round-actions" *ngIf="!hasIncompleteCurrentRound() && (!allSrrRoundsGenerated() || nextRequiredKnockoutStage())">
        <button *ngIf="!allSrrRoundsGenerated()" type="button" [disabled]="!canGenerateNextRound()" (click)="generateRound(nextRound())">
          Generate SRR Round #{{ nextRound() }}
        </button>
        <button *ngIf="allSrrRoundsGenerated() && nextRequiredKnockoutStage()" type="button" class="yellow-btn" [disabled]="!canGenerateKnockout(nextRequiredKnockoutStage())" (click)="generateKnockout(nextRequiredKnockoutStage())">
          Generate {{ knockoutStageLabel(nextRequiredKnockoutStage()) }}
        </button>
      </div>



      <div *ngIf="matches.length" class="card">
        <button
          type="button"
          class="secondary"
          (click)="setupPanelOpen = !setupPanelOpen"
        >
          {{
            setupPanelOpen
              ? "Hide Attendance / Roster"
              : "Open Attendance / Roster"
          }}
        </button>
        <div *ngIf="setupPanelOpen">
          <h3>Attendance</h3>
          <button type="button" class="secondary" (click)="selectAll(true)">
            Select All
          </button>
          <button type="button" class="secondary" (click)="selectAll(false)">
            Clear All
          </button>
          <div class="check-row" *ngFor="let p of players">
            <input
              type="checkbox"
              [(ngModel)]="p.attended"
              (change)="saveAttendance(p)"
            />
            <span
              >{{ displayRegistration(p) }}
              <small>({{ p.format }})</small></span
            >
            <button
              type="button"
              class="danger small"
              (click)="requestDanger('registration', p)"
            >
              Remove
            </button>
          </div>
          <hr />
          <h3>Upload Roster</h3>
          <input
            type="file"
            accept=".csv,.txt,.xlsx,.xls"
            (change)="onRosterFileSelected($event)"
          />
          <button
            type="button"
            [disabled]="!rosterFile"
            (click)="uploadRoster()"
          >
            Upload Roster
          </button>
          <span *ngIf="rosterMessage" class="ok">{{ rosterMessage }}</span>
        </div>
      </div>

      <div class="card danger-zone">
        <button type="button" class="secondary" (click)="freshStartOpen = !freshStartOpen">
          {{ freshStartOpen ? "Hide Admin Recovery Options" : "Open Admin Recovery Options" }}
        </button>
        <div *ngIf="freshStartOpen">
          <h3>Admin Recovery Options</h3>
          <p class="warning">Select the first incorrect round. That round and every later round will be deleted. Earlier completed rounds remain unchanged.</p>
          <label class="delete-option" *ngFor="let option of generatedRoundDeleteOptions()">
            <input type="checkbox" [checked]="isDeleteOptionSelected(option.key)" (change)="toggleDeleteOption(option.key, $event)">
            <span>{{option.label}}</span>
          </label>
          <label class="delete-option tournament-delete-option">
            <input type="checkbox" [checked]="isDeleteOptionSelected('TOURNAMENT')" (change)="toggleDeleteOption('TOURNAMENT', $event)">
            <span>Delete selected tournament</span>
          </label>
          <button type="button" class="danger" [disabled]="!deleteSelections.length" (click)="requestDanger('selected-delete')">Delete Selected</button>
        </div>
        <div *ngIf="dangerAction" class="danger-confirm">
          <label>Admin PIN required for {{ dangerLabel() }}</label>
          <div class="pin-row">
            <input
              type="password"
              [(ngModel)]="dangerPin"
              placeholder="Enter admin PIN"
              autocomplete="off"
            />
            <button
              type="button"
              class="danger"
              (click)="confirmDangerAction()"
            >
              Confirm
            </button>
            <button
              type="button"
              class="secondary"
              (click)="cancelDangerAction()"
            >
              Cancel
            </button>
          </div>
          <span *ngIf="dangerMessage" class="error">{{ dangerMessage }}</span>
        </div>
      </div>
    </ng-container>


<div *ngIf="selectedTournamentId && format" class="card scoring-link-card">
  <h3>Player Scoring</h3>
  <p class="muted">Share this link in WhatsApp group or email. Players will enter their registered phone number and see only their assigned venue score card.</p>

  <div class="share-link-row">
    <input readonly [value]="playerScoringLink()" />
    <button type="button" class="primary" (click)="copyPlayerScoringLink()">Copy Link</button>
  </div>

  <div class="share-link-row" *ngIf="isLocalTesting()">
    <input [(ngModel)]="scoringHostOverride" placeholder="Optional LAN IP, example 192.168.1.171">
    <button type="button" class="secondary" (click)="saveScoringHostOverride()">Use This IP</button>
  </div>
  <p class="warning" *ngIf="isLocalTesting()">For phone/tablet testing, use your real computer LAN IP from ipconfig. Use your PC IPv4. Current default is 192.168.1.171.</p>

  <div class="share-actions">
    <a class="secondary link-button" [href]="whatsAppShareLink()" target="_blank">Share in WhatsApp</a>
    <a class="secondary link-button" [href]="emailShareLink()">Share by Email</a>
  </div>

  <p class="ok" *ngIf="copyMessage">{{copyMessage}}</p>
  <p class="muted tiny-note">If WhatsApp does not make the link clickable, copy only the full http/https URL line and send it by itself.</p>
</div>
  `,
})
export class GamedayComponent implements OnInit {
  
  copyMessage = '';
  selectedGameDayTab = '';
  scoringHostOverride = localStorage.getItem('cacaScoringHostOverride') || '192.168.1.171';
  knockoutGroups = ['Champions','Challengers','Enthusiasts','Aspirants'];
  selectedKnockoutGroup = 'Champions';

tournaments: Tournament[] = [];
  rawPlayers: Registration[] = [];
  players: Registration[] = [];
  matches: Match[] = [];
  selectedTournamentId = "";
  format = "Singles";
  attendanceOpen = false;
  setupPanelOpen = false;
  freshStartOpen = false;
  dangerAction = "";
  dangerTarget?: Registration;
  dangerPin = "";
  dangerMessage = "";
  showPreviousRounds = false;
  rosterFile?: File;
  rosterMessage = "";
  selectedHistoryKey = "";
  deleteSelections: string[] = [];

  constructor(private api: ApiService,
    private router: Router, private admin: AdminAccessService, private config: AppConfigService) {}

  ngOnInit() {
    this.selectedTournamentId =
      localStorage.getItem("activeTournamentId") || "";
    this.format = localStorage.getItem("activeFormat") || "Singles";
    this.api.tournamentsByPin(this.admin.currentPin()).subscribe((t) => {
      this.tournaments = t || [];
        this.validateSelectedTournament();
        if (this.selectedTournamentId && !this.tournaments.some(x => x.id === this.selectedTournamentId)) {
          this.selectedTournamentId = '';
        }
      if (this.selectedTournamentId) this.loadPlayers();
    });
  }

  onTournamentChange() {
    const selected = this.selectedTournament();
    if (selected?.tournamentType) {
      this.format = selected.tournamentType;
    }
    this.loadPlayers();
  }

  selectedTournament() {
    return this.tournaments.find((t) => t.id === this.selectedTournamentId);
  }

  loadPlayers() {
    if (!this.selectedTournamentId) return;
    localStorage.setItem("activeTournamentId", this.selectedTournamentId);
    localStorage.setItem("activeFormat", this.format);
    this.api
      .registrationsByFormat(this.selectedTournamentId, this.format)
      .subscribe((p) => {
        this.rawPlayers = p;
        this.players = this.uniqueDisplayPlayers(p);
      });
    this.loadMatches();
  }

  loadMatches() {
    if (this.selectedTournamentId) {
      this.api
        .matches(this.selectedTournamentId, this.format)
        .subscribe((m) => {
          this.matches = m;
          this.selectedHistoryKey = "";
          this.deleteSelections = [];
          if (m.length) {
            this.setupPanelOpen = false;
            this.freshStartOpen = false;
          }
        });
    }
  }

  saveAttendance(p: Registration) {
    // For doubles/mixed doubles, apply attendance to all duplicate records for that playing unit.
    const registrations = this.registrationUnitMembers(p);
    registrations.forEach((r) => {
      r.attended = p.attended;
      if (r.id) this.api.updateAttendance(r.id, !!p.attended).subscribe();
    });
  }

  selectAll(v: boolean) {
    this.players.forEach((p) => {
      p.attended = v;
      this.saveAttendance(p);
    });
  }

  hasAttendance() {
    return this.players.some((p) => p.attended);
  }

  requestDanger(action: string, target?: Registration) {
    this.dangerAction = action;
    this.dangerTarget = target;
    this.dangerPin = "";
    this.dangerMessage = "";
    setTimeout(
      () =>
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        }),
      0,
    );
  }

  cancelDangerAction() {
    this.dangerAction = "";
    this.dangerTarget = undefined;
    this.dangerPin = "";
    this.dangerMessage = "";
  }

  dangerLabel() {
    if (this.dangerAction === "selected-delete") return "deleting selected recovery items";
    if (this.dangerAction === "registration") return "withdrawing player/team";
    return "admin action";
  }

  confirmDangerAction() {
    this.dangerMessage = "";
    if (!this.dangerPin) {
      this.dangerMessage = "Admin PIN is required";
      return;
    }
    if (this.dangerAction === "selected-delete") this.deleteSelectedRecoveryItems();
    if (this.dangerAction === "registration" && this.dangerTarget)
      this.deleteRegistrationUnit(this.dangerTarget);
  }

  deleteRegistrationUnit(p: Registration) {
    const label = this.displayRegistration(p);
    if (!confirm(`Withdraw player/team from future rounds: ${label}? Earlier completed results remain unchanged.`)) return;
    const registrations = this.registrationUnitMembers(p).filter((r) => !!r.id);
    let remaining = registrations.length;
    if (!remaining) return;
    registrations.forEach((r) => {
      this.api.deleteRegistration(r.id!, this.dangerPin).subscribe({
        next: () => {
          remaining--;
          if (remaining === 0) {
            this.cancelDangerAction();
            this.loadPlayers();
          }
        },
        error: (err) =>
          (this.dangerMessage = err?.error || "Unable to remove registration"),
      });
    });
  }

  generatedRoundDeleteOptions() {
    const options: { key: string; label: string; order: number }[] = [];
    const rounds = [...new Set(this.matches.filter((m:any) => (m.roundType || 'SRR').toUpperCase() === 'SRR').map((m:any) => Number(m.roundNumber || 0)).filter((r:number) => r > 0))].sort((a:number,b:number) => a-b);
    rounds.forEach((round:number) => options.push({key:`SRR:${round}`, label:`SRR Round ${round} and future rounds`, order:round}));
    [{type:'QUARTERS',label:'Quarterfinals and future rounds',order:100},{type:'SEMIFINALS',label:'Semifinals and Finals',order:200},{type:'FINALS',label:'Finals only',order:300}].forEach(stage => {
      if (this.matches.some((m:any) => (m.roundType || '').toUpperCase() === stage.type)) options.push({key:`${stage.type}:1`,label:stage.label,order:stage.order});
    });
    return options;
  }

  toggleDeleteOption(key: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked && !this.deleteSelections.includes(key)) this.deleteSelections = [...this.deleteSelections, key];
    if (!checked) this.deleteSelections = this.deleteSelections.filter(x => x !== key);
  }
  isDeleteOptionSelected(key: string) { return this.deleteSelections.includes(key); }

  deleteSelectedRecoveryItems() {
    if (!this.selectedTournamentId || !this.deleteSelections.length) return;
    if (this.deleteSelections.includes('TOURNAMENT')) { this.deleteTournament(); return; }
    const selected = this.generatedRoundDeleteOptions().filter(o => this.deleteSelections.includes(o.key)).sort((a,b) => a.order-b.order);
    if (!selected.length) return;
    const earliest = selected[0];
    const [roundType, n] = earliest.key.split(':');
    if (!confirm(`Delete ${earliest.label}? Earlier completed rounds will remain.`)) return;
    this.api.deleteSelectedRound(this.selectedTournamentId, this.format, roundType, Number(n || 1), this.dangerPin).subscribe({
      next: () => { this.deleteSelections=[]; this.cancelDangerAction(); this.loadMatches(); },
      error: err => this.dangerMessage = err?.error?.message || err?.error || 'Unable to delete selected round'
    });
  }

  nextRequiredKnockoutStage() {
    const hasQf=this.matches.some((m:any)=>(m.roundType||'').toUpperCase()==='QUARTERS');
    const hasSf=this.matches.some((m:any)=>(m.roundType||'').toUpperCase()==='SEMIFINALS');
    const hasF=this.matches.some((m:any)=>(m.roundType||'').toUpperCase()==='FINALS');
    if (!hasQf && !hasSf && !hasF) return this.players.length > 4 ? 'QUARTERS' : 'SEMIFINALS';
    if (hasQf && this.knockoutStageCompleted('QUARTERS') && !hasSf) return 'SEMIFINALS';
    if (hasSf && this.knockoutStageCompleted('SEMIFINALS') && !hasF) return 'FINALS';
    return '';
  }
  knockoutStageLabel(stage:string) { return stage==='QUARTERS'?'Quarterfinals':stage==='SEMIFINALS'?'Semifinals':stage==='FINALS'?'Finals':'Knockout Round'; }

  deleteGeneratedRounds() {
    if (!this.selectedTournamentId) return;
    if (
      !confirm(
        `Delete all generated rounds/matches for ${this.format}? Scores for this format will also be removed.`,
      )
    )
      return;
    this.api
      .deleteGeneratedRounds(
        this.selectedTournamentId,
        this.format,
        this.dangerPin,
      )
      .subscribe({
        next: () => {
          this.cancelDangerAction();
          this.loadMatches();
        },
        error: (err) =>
          (this.dangerMessage =
            err?.error || "Unable to delete generated rounds"),
      });
  }

  onRosterFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.rosterFile = input.files?.[0] || undefined;
    this.rosterMessage = "";
  }

  uploadRoster() {
    if (!this.selectedTournamentId || !this.rosterFile) return;
    this.api
      .uploadRoster(
        this.selectedTournamentId,
        this.format,
        "1123",
        this.rosterFile,
      )
      .subscribe({
        next: (res) => {
          this.rosterMessage = `Uploaded ${res.uploaded || 0} roster entries.`;
          this.rosterFile = undefined;
          this.loadPlayers();
        },
        error: (err) => alert(err?.error || "Roster upload failed"),
      });
  }

  deleteTournament() {
    const selected = this.selectedTournament();
    if (!selected?.id) return;
    if (
      !confirm(
        `Delete tournament "${selected.name}"? This also deletes its registrations and generated matches.`,
      )
    )
      return;
    this.api.deleteTournament(selected.id, this.dangerPin).subscribe({
      next: () => {
        this.selectedTournamentId = "";
        this.players = [];
        this.rawPlayers = [];
        this.matches = [];
        this.api.tournamentsByPin(this.admin.currentPin()).subscribe((t) => (this.tournaments = t || []));
      },
      error: (err) => alert(err?.error || "Unable to delete tournament"),
    });
  }

  uniqueDisplayPlayers(players: Registration[]): Registration[] {
    if (!(this.format === "Doubles" || this.format === "Mixed Doubles")) {
      return players;
    }
    const map = new Map<string, Registration>();
    players.forEach((p) => {
      const key = this.playingUnitKey(p);
      if (!map.has(key)) {
        map.set(key, p);
      }
    });
    return Array.from(map.values());
  }

  registrationUnitMembers(p: Registration): Registration[] {
    if (!(this.format === "Doubles" || this.format === "Mixed Doubles"))
      return [p];
    const key = this.playingUnitKey(p);
    return this.rawPlayers.filter((r) => this.playingUnitKey(r) === key);
  }

  playingUnitKey(p: Registration): string {
    if (
      (this.format === "Doubles" || this.format === "Mixed Doubles") &&
      p.partnerName
    ) {
      return [this.cleanName(p.playerName), this.cleanName(p.partnerName)]
        .sort()
        .join("__");
    }
    return p.id || this.cleanName(p.playerName);
  }

  cleanName(value: string): string {
    return (value || "").trim().replace(/\s+/g, " ").toLowerCase();
  }

  displayRegistration(p: Registration): string {
    if (
      (p.format === "Doubles" || p.format === "Mixed Doubles") &&
      p.partnerName
    ) {
      return `${p.playerName} / ${p.partnerName}`;
    }
    return p.playerName;
  }

  srrMatches() {
    return this.matches.filter((m) => m.roundType === "SRR");
  }

  roundsSelected() {
    return [...new Set(this.srrMatches().map((m) => m.roundNumber))].sort(
      (a, b) => a - b,
    );
  }

  lastGeneratedRound() {
    const rounds = this.roundsSelected();
    return rounds.length ? Math.max(...rounds) : 0;
  }

  maxSrrRounds() {
    return this.selectedTournament()?.srrRounds || 5;
  }

  nextRound() {
    const configured = Number(this.selectedTournament()?.srrRounds || 0);
    const next = this.lastGeneratedRound() + 1;
    return configured > 0 ? Math.min(next, configured) : next;
  }

  currentRoundMatches() {
    const last = this.lastGeneratedRound();
    return this.srrMatches().filter((m) => m.roundNumber === last);
  }



  defaultGameDayTab() {
    const hasKo = this.knockoutMatches().length > 0;
    if (hasKo) return 'KO';
    const rounds = this.matches
      .filter((m: any) => (m.roundType || 'SRR').toUpperCase() === 'SRR')
      .map((m: any) => Number(m.roundNumber || 0))
      .filter((r: number) => r > 0);
    const latest = rounds.length ? Math.max(...rounds) : 0;
    return latest ? `SRR-${latest}` : '';
  }

  gamedayRoundTabs() {
    const srrRounds = [...new Set(this.matches
      .filter((m: any) => (m.roundType || 'SRR').toUpperCase() === 'SRR')
      .map((m: any) => m.roundNumber || 0)
      .filter((r: number) => r > 0))]
      .sort((a: number, b: number) => a - b)
      .map((r: number) => ({ key: `SRR-${r}`, label: `SRR ${r}` }));

    const hasKnockout = this.knockoutMatches().length > 0;
    const tabs = hasKnockout ? [...srrRounds, { key: 'KO', label: 'Knockout Bracket' }] : srrRounds;

    if (!this.selectedGameDayTab && tabs.length) {
      this.selectedGameDayTab = tabs[tabs.length - 1].key;
    }

    return tabs;
  }

  selectGameDayTab(key: string) {
    this.selectedGameDayTab = key;
  }

  selectedGameDayMatches() {
    if (!this.selectedGameDayTab || this.selectedGameDayTab === 'KO') {
      return this.visibleMatchups();
    }
    if (this.selectedGameDayTab.startsWith('SRR-')) {
      const round = Number(this.selectedGameDayTab.replace('SRR-', ''));
      return this.matches
        .filter((m: any) => (m.roundType || 'SRR').toUpperCase() === 'SRR' && Number(m.roundNumber || 0) === round)
        .sort((a: any, b: any) => Number(a.boardNumber || 999) - Number(b.boardNumber || 999));
    }
    return this.visibleMatchups();
  }

  activeMatchRound() {
    const ko = this.currentKnockoutMatches();
    if (ko.length)
      return {
        type: ko[0].roundType || "",
        roundNumber: ko[0].roundNumber || 0,
      };
    const last = this.lastGeneratedRound();
    return last
      ? { type: "SRR", roundNumber: last }
      : { type: "", roundNumber: 0 };
  }

  activeRoundLabel() {
    const active = this.activeMatchRound();
    if (!active.type) return "No Active Round";
    if (active.type === "SRR") return `SRR Round #${active.roundNumber}`;
    return this.stageDisplay(active.type);
  }

  matchRoundLabel(m: Match) {
    if (m.roundType === "SRR") return `SRR Round #${m.roundNumber}`;
    return this.stageDisplay(m.roundType);
  }

  previousBracketGroups() {
    const active = this.activeMatchRound();
    const groups: { key: string; label: string }[] = [];
    this.roundsSelected().forEach((r) => {
      const key = `SRR-${r}`;
      if (!(active.type === "SRR" && active.roundNumber === r))
        groups.push({ key, label: `SRR #${r}` });
    });
    ["PRE_QUARTERS", "QUARTERS", "SEMIFINALS", "FINALS"].forEach((stage) => {
      if (this.knockoutStageGenerated(stage) && !(active.type === stage))
        groups.push({ key: stage, label: this.stageDisplay(stage) });
    });
    return groups;
  }

  selectHistoryGroup(key: string) {
    this.selectedHistoryKey = key;
  }

  previousRoundMatches() {
    if (!this.selectedHistoryKey) {
      const first = this.previousBracketGroups()[0];
      if (!first) return [];
      this.selectedHistoryKey = first.key;
    }
    if (this.selectedHistoryKey.startsWith("SRR-")) {
      const r = Number(this.selectedHistoryKey.replace("SRR-", ""));
      return this.srrMatches().filter((m) => m.roundNumber === r);
    }
    return this.matches.filter((m) => m.roundType === this.selectedHistoryKey);
  }

  visibleMatchups() {
    if (this.showPreviousRounds) return this.previousRoundMatches();
    const active = this.activeMatchRound();
    if (!active.type) return [];
    if (active.type === "SRR") return this.currentRoundMatches();
    return this.matches.filter((m) => m.roundType === active.type);
  }

  knockoutMatches() {
    return this.matches.filter((m) => m.roundType && m.roundType !== "SRR");
  }


  hasKnockoutBracket() {
    return this.knockoutMatches().length > 0;
  }


  knockoutMatchesForStage(stage: string) {
    return this.matches
      .filter((m: any) => m.roundType === stage)
      .sort((a: any, b: any) => Number(a.boardNumber || 999) - Number(b.boardNumber || 999));
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

  currentKnockoutMatches() {
    const order = ["QUARTERS", "SEMIFINALS", "FINALS"];
    const generated = order.filter((stage) => this.knockoutStageGenerated(stage));
    if (!generated.length) return [];
    const currentStage = generated[generated.length - 1];
    return this.matches.filter((m) => m.roundType === currentStage);
  }

  currentKnockoutGroups() {
    const preferred = ["Champions", "Challengers", "Enthusiasts", "Aspirants", "Main"];
    const groups = [...new Set(this.currentKnockoutMatches().map((m:any) => m.roundGroup || "Main"))];
    return preferred.filter(g => groups.includes(g)).concat(groups.filter(g => !preferred.includes(g)));
  }

  currentKnockoutMatchesByGroup(group: string) {
    return this.currentKnockoutMatches().filter((m:any) => (m.roundGroup || "Main") === group);
  }

  activeParticipantCount() {
    return this.players.filter((p) => p.attended).length;
  }

  knockoutStageGenerated(stage: string) {
    return this.knockoutMatches().some((m) => m.roundType === stage);
  }

  stageDisplay(stage?: string) {
    if (stage === "PRE_QUARTERS") return "Pre-Quarters";
    if (stage === "QUARTERS") return "Quarters";
    if (stage === "SEMIFINALS") return "Semifinals";
    if (stage === "FINALS") return "Finals";
    return stage || "";
  }

  hasIncompleteCurrentRound() {
    const current = this.currentRoundMatches();
    return (
      current.length > 0 &&
      current.some((m) => {
        if (m.status === "BYE")
          return (
            !m.scoreFinalized ||
            m.player1Score === undefined ||
            m.player1Score === null
          );
        return (
          m.status !== "COMPLETED" ||
          !m.scoreFinalized ||
          m.player1Score === undefined ||
          m.player2Score === undefined ||
          m.player1Score === null ||
          m.player2Score === null
        );
      })
    );
  }

  allSrrRoundsGenerated() {
    const configured = Number(this.selectedTournament()?.srrRounds || 0);
    return configured > 0 && this.lastGeneratedRound() >= configured;
  }

  canGenerateNextRound() {
    if (!this.selectedTournamentId || this.allSrrRoundsGenerated())
      return false;
    if (this.nextRound() === 1) return this.hasAttendance();
    return !this.hasIncompleteCurrentRound();
  }

  canOpenKnockouts() {
    return this.allSrrRoundsGenerated() && !this.hasIncompleteCurrentRound();
  }

  canGenerateKnockout(stage: string) {
    if (!this.selectedTournamentId || !this.canOpenKnockouts() || this.knockoutStageGenerated(stage)) return false;
    const count = this.activeParticipantCount();

    // Requirements:
    // - SRR must be fully complete first.
    // - If fewer than 5 players/teams, no quarters; generate semifinals/finals only.
    // - If 5 or more, generate group quarters. Groups are split by final SRR rank in blocks of 8.
    if (stage === "QUARTERS") return count >= 5;

    if (stage === "SEMIFINALS") {
      if (count < 2) return false;
      if (count <= 4) return true;
      return this.knockoutStageGenerated("QUARTERS") && this.knockoutStageCompleted("QUARTERS");
    }

    if (stage === "FINALS") {
      return this.knockoutStageGenerated("SEMIFINALS") && this.knockoutStageCompleted("SEMIFINALS");
    }

    return false;
  }

  knockoutStageCompleted(stage: string) {
    const matches = this.knockoutMatches().filter((m) => m.roundType === stage);
    return (
      matches.length > 0 && matches.every((m) => m.scoreFinalized && m.winnerId)
    );
  }

  roundStatusMessage() {
    const last = this.lastGeneratedRound();
    if (!last) return "No SRR round generated yet.";
    if (this.hasIncompleteCurrentRound())
      return `SRR Round #${last} is generated but scores are not fully completed.`;
    if (this.allSrrRoundsGenerated())
      return "All configured SRR rounds are generated and completed. Knockout setup can start next.";
    return `SRR Round #${last} completed. SRR Round #${last + 1} is now available.`;
  }

  generateRound(r: number) {
    if (!this.selectedTournamentId || !this.canGenerateNextRound()) return;
    this.api
      .generateRound(this.selectedTournamentId, this.format, r, "Board")
      .subscribe({
        next: () => this.loadMatches(),
        error: (err) => alert(err?.error || "Unable to generate round"),
      });
  }

  goToScores() {
    if (this.selectedTournamentId)
      localStorage.setItem("activeTournamentId", this.selectedTournamentId);
    if (this.format) localStorage.setItem("activeFormat", this.format);
    this.router.navigate(["/scores"]);
  }

  generateKnockout(stage: string) {
    if (!this.selectedTournamentId || !this.canGenerateKnockout(stage)) return;
    this.api
      .generateKnockout(this.selectedTournamentId, this.format, stage)
      .subscribe({
        next: () => this.loadMatches(),
        error: (err) =>
          alert(err?.error || "Unable to generate knockout round"),
      });
  }



  isSuperAdmin(): boolean {
    return this.admin.isSuperAdmin();
  }

  deleteOneRound(m: Match) {
    if (!m.roundType || !m.roundNumber || !this.selectedTournamentId) return;
    if (!confirm(`Delete ${this.stageDisplay(m.roundType)} Round #${m.roundNumber}? This deletes only this round/stage for ${this.format}.`)) return;
    this.api.deleteSelectedRound(this.selectedTournamentId, this.format, m.roundType, m.roundNumber, this.admin.currentPin()).subscribe({
      next: () => this.loadMatches(),
      error: err => alert(err?.error || 'Unable to delete selected round')
    });
  }

  saveBoard(m: Match) {
    if (!m.id) return;
    this.api.updateMatchBoard(m.id, m.boardNumber || '', m.venueName || 'Board', this.admin.currentPin()).subscribe({
      next: () => this.loadMatches(),
      error: err => alert(err?.error || 'Unable to update board number')
    });
  }


  normalizeRegistrationForDisplay(r:any): any {
    const playerName = String(r?.playerName || '').trim();
    const email = String(r?.email || '').trim();
    const phone = String(r?.phone || '').trim();
    const badName = playerName === '#' || /^\d+$/.test(playerName);
    const emailLooksLikeName = !!email && !email.includes('@') && /[A-Za-z]/.test(email);
    const phoneLooksLikeFormat = ['Singles','Doubles','Mixed Doubles','Team Event'].includes(phone);
    if (badName && emailLooksLikeName) {
      return {...r, playerName: email, email: '', format: phoneLooksLikeFormat ? phone : r.format, phone: phoneLooksLikeFormat ? '' : phone};
    }
    return r;
  }

  validateSelectedTournament() {
    if (this.selectedTournamentId && !this.tournaments.some(t => t.id === this.selectedTournamentId)) {
      this.selectedTournamentId = '';
    }
  }

  playerScoringLink(): string {
    if (!this.selectedTournamentId || !this.format) return '';
    const base = this.config.publicFrontendBaseUrl();
    return `${base}/player-score?tournamentId=${encodeURIComponent(this.selectedTournamentId)}&format=${encodeURIComponent(this.format)}`;
  }

  isLocalTesting(): boolean {
    return this.config.isLocalTesting();
  }


  saveScoringHostOverride() {
    const value = (this.scoringHostOverride || '').trim();
    if (value) localStorage.setItem('cacaScoringHostOverride', value);
    else localStorage.removeItem('cacaScoringHostOverride');
    this.copyMessage = 'Scoring link IP updated.';
    setTimeout(() => this.copyMessage = '', 2500);
  }

  copyPlayerScoringLink() {
    const link = this.playerScoringLink();
    if (!link) return;
    navigator.clipboard?.writeText(link).then(() => {
      this.copyMessage = 'Player scoring link copied.';
      setTimeout(() => this.copyMessage = '', 2500);
    }).catch(() => {
      this.copyMessage = 'Copy failed. Please copy the link manually.';
    });
  }

  whatsAppShareLink(): string {
    const link = this.playerScoringLink();
    const message = `CACA Tournament Player Scoring Link

${link}

Tap the link, enter your registered phone number, and submit your venue score.`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  }

  emailShareLink(): string {
    const subject = encodeURIComponent('CACA Tournament Player Scoring Link');
    const body = encodeURIComponent(`Please use this scoring link to enter your assigned board score:\n\n${this.playerScoringLink()}\n\nEnter your registered phone number when prompted.`);
    return `mailto:?subject=${subject}&body=${body}`;
  }


}
