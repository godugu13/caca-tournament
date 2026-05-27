import { Component, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NgFor, NgIf } from "@angular/common";
import { Router } from "@angular/router";
import { ApiService } from "../../services/api.service";
import { AdminAccessService } from '../../services/admin-access.service';
import { Match, Registration, Tournament } from "../../models/models";

@Component({
  selector: "app-gameday",
  standalone: true,
  imports: [FormsModule, NgFor, NgIf],
  template: `
    <h2>Game Day Setup</h2>

<div *ngIf="selectedTournamentId && format" class="card scoring-link-card">
  <h3>Player Mobile Scoring Link</h3>
  <p class="muted">Share this link in WhatsApp group or email. Players will enter their registered phone number and see only their assigned venue score card.</p>

  <div class="share-link-row">
    <input readonly [value]="playerScoringLink()" />
    <button type="button" class="primary" (click)="copyPlayerScoringLink()">Copy Link</button>
  </div>

  <div class="share-actions">
    <a class="secondary link-button" [href]="whatsAppShareLink()" target="_blank">Share in WhatsApp</a>
    <a class="secondary link-button" [href]="emailShareLink()">Share by Email</a>
  </div>

  <p class="ok" *ngIf="copyMessage">{{copyMessage}}</p>
</div>


    <div class="card form">
      <label>Select Tournament</label>
      <select
        [(ngModel)]="selectedTournamentId"
        (change)="onTournamentChange()"
      >
        <option value="">Select Tournament</option>
        <option *ngFor="let t of tournaments" [value]="t.id">
          {{ t.name }}
        </option>
      </select>

      <label>Format</label>
      <select [(ngModel)]="format" (change)="loadPlayers()">
        <option>Singles</option>
        <option>Doubles</option>
        <option>Mixed Doubles</option>
        <option>Team Event</option>
      </select>
    </div>

    <ng-container *ngIf="selectedTournamentId">
      <div *ngIf="matches.length" class="card gameday-current-card">
        <div class="section-header">
          <div>
            <h3>Generated Matchups</h3>
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
          <div class="match-card" *ngFor="let m of visibleMatchups()">
            <b
              >{{ matchRoundLabel(m) }} -
              {{ m.status === "BYE" ? "BYE" : "Board #" + m.boardNumber }}</b
            >
            <p>Rank {{ m.player1Rank || "-" }}: {{ m.player1Name }}</p>
            <ng-container *ngIf="m.status !== 'BYE'; else byeBlock">
              <p>vs</p>
              <p>Rank {{ m.player2Rank || "-" }}: {{ m.player2Name }}</p>
            </ng-container>
            <ng-template #byeBlock
              ><p class="ok">BYE - no opponent this round</p></ng-template
            >
            <small>Status: {{ m.status }}</small>
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
              Remove
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
        <h3>Generated Matchups</h3>
        <p class="muted">
          No matchups generated yet. Confirm attendance, then generate SRR Round
          #1.
        </p>
      </div>

      <div class="card">
        <h3>SRR Round Execution</h3>
        <p *ngIf="!matches.length">
          Only SRR Round #1 is available first. SRR Round #2 will open only
          after all SRR #1 scores are completed.
        </p>
        <p *ngIf="matches.length">Current status: {{ roundStatusMessage() }}</p>

        <button
          type="button"
          [disabled]="!canGenerateNextRound()"
          (click)="generateRound(nextRound())"
        >
          Generate SRR Round #{{ nextRound() }}
        </button>

        <p class="warning" *ngIf="!hasAttendance()">
          Select attendance before generating SRR Round #1.
        </p>
        <p class="warning" *ngIf="hasIncompleteCurrentRound()">
          Complete all scores for SRR Round #{{ lastGeneratedRound() }} before
          generating the next round.
        </p>
        <p class="warning" *ngIf="allSrrRoundsGenerated()">
          All configured SRR rounds are already generated.
        </p>
      </div>

      <div class="card">
        <h3>Knockout Rounds</h3>
<div class="knockout-group-tabs">
  <label>Select Knockout Group</label>
  <select [(ngModel)]="selectedKnockoutGroup">
    <option *ngFor="let g of knockoutGroups" [value]="g">{{g}}</option>
  </select>
  <small class="muted">For 32+ players/teams: Champions ranks 1-8, Challengers 9-16, Enthusiasts 17-24, Aspirants 25-32.</small>
</div>
        <p>
          Knockout generation opens after SRR rounds are completed. Admin can
          choose the starting stage based on team count and time.
        </p>
        <p class="muted">
          Seed rules: Quarters use Rank 1 vs Rank 8, 2 vs 7, 3 vs 6, 4 vs 5.
          Semis use winners from those bracket paths. Finals use semifinal
          winners. If active teams are fewer than 8, start with Semifinals and
          Finals.
        </p>
        <div class="ko-flow knockout-actions">
          <button
            type="button"
            [disabled]="!canGenerateKnockout('PRE_QUARTERS')"
            (click)="generateKnockout('PRE_QUARTERS')"
          >
            Generate Pre-Quarters
          </button>
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
            Generate Semifinals
          </button>
          <button
            type="button"
            [disabled]="!canGenerateKnockout('FINALS')"
            (click)="generateKnockout('FINALS')"
          >
            Generate Finals
          </button>
        </div>
        <div *ngIf="currentKnockoutMatches().length" class="score-link-row">
          <button type="button" class="yellow-btn" (click)="goToScores()">
            Enter / View Scores for Current Knockout Round
          </button>
          <span class="muted"
            >Scores page supports SRR, Pre-Quarters, Quarters, Semifinals, and
            Finals.</span
          >
        </div>

        <div class="match-grid" *ngIf="currentKnockoutMatches().length">
          <div class="match-card" *ngFor="let m of currentKnockoutMatches()">
            <b>{{ stageDisplay(m.roundType) }} - Board #{{ m.boardNumber }}</b>
            <p>Rank {{ m.player1Rank || "-" }}: {{ m.player1Name }}</p>
            <p>vs</p>
            <p>Rank {{ m.player2Rank || "-" }}: {{ m.player2Name }}</p>
            <small>Status: {{ m.status }}</small>
            <div class="score-link-row">
              <button
                type="button"
                class="secondary small"
                (click)="goToScores()"
              >
                Open Score Entry
              </button>
            </div>
          </div>
        </div>
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
        <button
          type="button"
          class="secondary"
          (click)="freshStartOpen = !freshStartOpen"
        >
          {{
            freshStartOpen
              ? "Hide Admin Fresh Start Options"
              : "Open Admin Fresh Start Options"
          }}
        </button>
        <div *ngIf="freshStartOpen">
          <h3>Admin Fresh Start Options</h3>
          <p class="warning">
            Use these only when you want to reset tournament setup or correct
            test data.
          </p>
          <button
            type="button"
            class="danger"
            [disabled]="!matches.length"
            (click)="requestDanger('rounds')"
          >
            Delete Generated SRR/KO Rounds for {{ format }}
          </button>
          <button
            type="button"
            class="danger"
            (click)="requestDanger('tournament')"
          >
            Delete Selected Tournament
          </button>
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
  `,
})
export class GamedayComponent implements OnInit {
  
  copyMessage = '';
  knockoutGroups = ['Champions','Challengers','Enthusiasts','Aspirants'];
  selectedKnockoutGroup = 'Champions';
  scoringHostOverride = localStorage.getItem('cacaScoringHostOverride') || '192.164.1.171';
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

  constructor(private api: ApiService,
    private router: Router, private admin: AdminAccessService) {}

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
    if (this.dangerAction === "rounds") return "deleting generated rounds";
    if (this.dangerAction === "tournament") return "deleting tournament";
    if (this.dangerAction === "registration") return "removing registration";
    return "admin action";
  }

  confirmDangerAction() {
    this.dangerMessage = "";
    if (!this.dangerPin) {
      this.dangerMessage = "Admin PIN is required";
      return;
    }
    if (this.dangerAction === "rounds") this.deleteGeneratedRounds();
    if (this.dangerAction === "tournament") this.deleteTournament();
    if (this.dangerAction === "registration" && this.dangerTarget)
      this.deleteRegistrationUnit(this.dangerTarget);
  }

  deleteRegistrationUnit(p: Registration) {
    const label = this.displayRegistration(p);
    if (!confirm(`Remove registered player/team: ${label}?`)) return;
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
    const last = this.lastGeneratedRound();
    return last ? last + 1 : 1;
  }

  currentRoundMatches() {
    const last = this.lastGeneratedRound();
    return this.srrMatches().filter((m) => m.roundNumber === last);
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

  currentKnockoutMatches() {
    const order = ["PRE_QUARTERS", "QUARTERS", "SEMIFINALS", "FINALS"];
    const generated = order.filter((stage) =>
      this.knockoutStageGenerated(stage),
    );
    if (!generated.length) return [];
    const currentStage = generated[generated.length - 1];
    return this.matches.filter((m) => m.roundType === currentStage);
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
    return this.lastGeneratedRound() >= this.maxSrrRounds();
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
    if (
      !this.selectedTournamentId ||
      !this.canOpenKnockouts() ||
      this.knockoutStageGenerated(stage)
    )
      return false;
    const count = this.activeParticipantCount();
    if (stage === "PRE_QUARTERS" && count < 16) return false;
    if (stage === "QUARTERS" && count < 8) return false;
    if (stage === "SEMIFINALS") {
      if (count < 4) return false;
      if (
        this.knockoutStageGenerated("QUARTERS") &&
        !this.knockoutStageCompleted("QUARTERS")
      )
        return false;
      if (
        this.knockoutStageGenerated("PRE_QUARTERS") &&
        !this.knockoutStageCompleted("PRE_QUARTERS")
      )
        return false;
    }
    if (stage === "FINALS") {
      if (this.knockoutStageGenerated("SEMIFINALS"))
        return this.knockoutStageCompleted("SEMIFINALS");
      return count >= 2;
    }
    if (
      stage === "QUARTERS" &&
      this.knockoutStageGenerated("PRE_QUARTERS") &&
      !this.knockoutStageCompleted("PRE_QUARTERS")
    )
      return false;
    return true;
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


  validateSelectedTournament() {
    if (this.selectedTournamentId && !this.tournaments.some(t => t.id === this.selectedTournamentId)) {
      this.selectedTournamentId = '';
    }
  }

  playerScoringLink(): string {
    if (!this.selectedTournamentId || !this.format) return '';
    const protocol = window.location.protocol || 'http:';
    const currentHost = window.location.hostname;
    const isLocalOrLan = currentHost === 'localhost' || currentHost === '127.0.0.1' ||
      /^192\.168\./.test(currentHost) || /^10\./.test(currentHost) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(currentHost);
    const host = isLocalOrLan && this.scoringHostOverride && this.scoringHostOverride.trim()
      ? this.scoringHostOverride.trim()
      : currentHost;
    const portPart = window.location.port && isLocalOrLan ? `:${window.location.port}` : '';
    return `${protocol}//${host}${portPart}/player-score?tournamentId=${encodeURIComponent(this.selectedTournamentId)}&format=${encodeURIComponent(this.format)}`;
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
    const message = `CACA Tournament scoring link: ${this.playerScoringLink()}%0AEnter your registered phone number to update your assigned board score.`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }

  emailShareLink(): string {
    const subject = encodeURIComponent('CACA Tournament Player Scoring Link');
    const body = encodeURIComponent(`Please use this scoring link to enter your assigned board score:\n\n${this.playerScoringLink()}\n\nEnter your registered phone number when prompted.`);
    return `mailto:?subject=${subject}&body=${body}`;
  }


}
