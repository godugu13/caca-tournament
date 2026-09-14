import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppConfigService } from './app-config.service';
import { Observable, shareReplay, tap } from 'rxjs';
import { Match, Registration, Standing, Tournament, Member, PlayerScoreLookupResponse, DashboardTournament, PublicRegistration } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  // Step 28.5 deployment aware API URL.
  // Local testing:
  //   http://localhost:4200  -> http://localhost:8080/api
  //   http://192.x.x.x:4200  -> http://192.x.x.x:8080/api
  // Production:
  //   Uses environment.apiBaseUrl / the configured Render backend.
  //   The old Deployment Settings screen is no longer part of normal navigation.
  private baseUrl = '';
  private tournamentCatalogCache$?: Observable<Tournament[]>;
  private tournamentByPinCache = new Map<string, Observable<Tournament[]>>();
  private dashboardTournamentCache$?: Observable<DashboardTournament[]>;

  constructor(private http: HttpClient, private config: AppConfigService) { this.baseUrl = this.config.apiBaseUrl(); }

  private clearTournamentCaches(): void {
    this.tournamentCatalogCache$ = undefined;
    this.tournamentByPinCache.clear();
    this.dashboardTournamentCache$ = undefined;
  }

  private clearDashboardCache(): void {
    this.dashboardTournamentCache$ = undefined;
  }

  ping(): Observable<any> { return this.http.get<any>(`${this.baseUrl}/ping`); }

  tournaments(forceRefresh: boolean = false): Observable<Tournament[]> {
    if (forceRefresh || !this.tournamentCatalogCache$) {
      this.tournamentCatalogCache$ = this.http
        .get<Tournament[]>(`${this.baseUrl}/tournaments/catalog`)
        .pipe(shareReplay({bufferSize: 1, refCount: false}));
    }
    return this.tournamentCatalogCache$;
  }

  tournamentsByPin(pin: string, forceRefresh: boolean = false): Observable<Tournament[]> {
    const key = (pin || '').trim();
    if (forceRefresh || !this.tournamentByPinCache.has(key)) {
      this.tournamentByPinCache.set(
        key,
        this.http
          .get<Tournament[]>(`${this.baseUrl}/tournaments/by-pin?pin=${encodeURIComponent(key)}`)
          .pipe(shareReplay({bufferSize: 1, refCount: false}))
      );
    }
    return this.tournamentByPinCache.get(key)!;
  }

  manageTournaments(pin: string): Observable<Tournament[]> {
    return this.http.get<Tournament[]>(`${this.baseUrl}/tournaments/manage?pin=${encodeURIComponent(pin || '')}`);
  }

  restoreTournament(tournamentId: string, pin: string): Observable<Tournament> {
    return this.http
      .put<Tournament>(`${this.baseUrl}/tournaments/${tournamentId}/restore?pin=${encodeURIComponent(pin || '')}`, {})
      .pipe(tap(() => this.clearTournamentCaches()));
  }

  dashboardTournaments(forceRefresh: boolean = false): Observable<DashboardTournament[]> {
    if (forceRefresh || !this.dashboardTournamentCache$) {
      this.dashboardTournamentCache$ = this.http
        .get<DashboardTournament[]>(`${this.baseUrl}/tournaments/dashboard`)
        .pipe(shareReplay({bufferSize: 1, refCount: false}));
    }
    return this.dashboardTournamentCache$;
  }

  createTournament(t: Tournament): Observable<Tournament> {
    return this.http.post<Tournament>(`${this.baseUrl}/tournaments`, t)
      .pipe(tap(() => this.clearTournamentCaches()));
  }

  updateTournament(id: string, t: Tournament, pin: string): Observable<Tournament> {
    return this.http.put<Tournament>(`${this.baseUrl}/tournaments/${id}?pin=${encodeURIComponent(pin || '')}`, t)
      .pipe(tap(() => this.clearTournamentCaches()));
  }

  deleteTournament(tournamentId: string, pin: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/tournaments/${tournamentId}?pin=${encodeURIComponent(pin)}`)
      .pipe(tap(() => this.clearTournamentCaches()));
  }

  finalizeTournament(tournamentId: string, pin: string): Observable<Tournament> {
    return this.http.put<Tournament>(`${this.baseUrl}/tournaments/${tournamentId}/finalize?pin=${encodeURIComponent(pin)}`, {})
      .pipe(tap(() => this.clearTournamentCaches()));
  }

  reopenTournament(tournamentId: string, pin: string): Observable<Tournament> {
    return this.http.put<Tournament>(`${this.baseUrl}/tournaments/${tournamentId}/reopen?pin=${encodeURIComponent(pin)}`, {})
      .pipe(tap(() => this.clearTournamentCaches()));
  }

  setTournamentDashboardHidden(tournamentId: string, hidden: boolean, pin: string): Observable<Tournament> {
    return this.http.put<Tournament>(`${this.baseUrl}/tournaments/${tournamentId}/dashboard-visibility?hidden=${hidden}&pin=${encodeURIComponent(pin || '')}`, {})
      .pipe(tap(() => this.clearTournamentCaches()));
  }
  registrations(tournamentId: string): Observable<Registration[]> { return this.http.get<Registration[]>(`${this.baseUrl}/registrations/tournament/${tournamentId}`); }
  publicRegistrationNames(tournamentId: string): Observable<PublicRegistration[]> { return this.http.get<PublicRegistration[]>(`${this.baseUrl}/registrations/tournament/${tournamentId}/public-names`); }
  currentPublicRegistrationNames(): Observable<PublicRegistration[]> { return this.http.get<PublicRegistration[]>(`${this.baseUrl}/registrations/current/public-names`); }
  currentRegistrations(): Observable<Registration[]> { return this.http.get<Registration[]>(`${this.baseUrl}/registrations/current`); }
  registrationsByFormat(tournamentId: string, format: string): Observable<Registration[]> { return this.http.get<Registration[]>(`${this.baseUrl}/registrations/tournament/${tournamentId}/${format}`); }
  register(r: Registration): Observable<Registration> { return this.http.post<Registration>(`${this.baseUrl}/registrations`, r); }
  memberById(membershipId: string): Observable<Member> { return this.http.get<Member>(`${this.baseUrl}/members/${encodeURIComponent(membershipId)}`); }
  memberByEmail(email: string): Observable<Member> { return this.http.get<Member>(`${this.baseUrl}/members/by-email?email=${encodeURIComponent(email)}`); }
  uploadRoster(tournamentId: string, format: string, pin: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tournamentId', tournamentId);
    formData.append('format', format);
    formData.append('pin', pin);
    return this.http.post<any>(`${this.baseUrl}/roster/upload`, formData);
  }
  exportRegisteredPlayers(tournamentId: string, format: string = ''): Observable<Blob> {
    const params = `tournamentId=${encodeURIComponent(tournamentId)}${format ? `&format=${encodeURIComponent(format)}` : ''}`;
    return this.http.get(`${this.baseUrl}/roster/export?${params}`, { responseType: 'blob' });
  }

  deleteRegistration(registrationId: string, pin: string): Observable<any> { return this.http.delete<any>(`${this.baseUrl}/registrations/${registrationId}?pin=${encodeURIComponent(pin)}`); }
  deleteRegistrationsBulk(registrationIds: string[], pin: string): Observable<any> { return this.http.post<any>(`${this.baseUrl}/registrations/bulk-delete?pin=${encodeURIComponent(pin)}`, registrationIds); }
  updateAttendance(registrationId: string, attended: boolean): Observable<Registration> { return this.http.put<Registration>(`${this.baseUrl}/registrations/${registrationId}/attendance`, { attended }); }
  updatePaymentStatus(registrationId: string, paymentStatus: string): Observable<Registration> { return this.http.put<Registration>(`${this.baseUrl}/registrations/${registrationId}/payment`, { paymentStatus }); }
  generateRound(tournamentId: string, format: string, round: number, venue: string): Observable<Match[]> {
    return this.http.post<Match[]>(`${this.baseUrl}/gameday/${tournamentId}/${format}/round/${round}/generate?venueName=${encodeURIComponent(venue)}`, {})
      .pipe(tap(() => this.clearDashboardCache()));
  }
  generateKnockout(tournamentId: string, format: string, stage: string, group: string = ''): Observable<Match[]> {
    return this.http.post<Match[]>(`${this.baseUrl}/gameday/${tournamentId}/${format}/knockout/${encodeURIComponent(stage)}/generate?group=${encodeURIComponent(group)}`, {})
      .pipe(tap(() => this.clearDashboardCache()));
  }
  matches(tournamentId: string, format: string, playerLookup: string = ''): Observable<Match[]> { const q = playerLookup ? `?playerLookup=${encodeURIComponent(playerLookup)}` : ''; return this.http.get<Match[]>(`${this.baseUrl}/gameday/${tournamentId}/${format}/matches${q}`); }
  deleteGeneratedRounds(tournamentId: string, format: string, pin: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/gameday/${tournamentId}/${format}/matches?pin=${encodeURIComponent(pin)}`)
      .pipe(tap(() => this.clearDashboardCache()));
  }
  saveScore(match: Match): Observable<Match> { return this.http.put<Match>(`${this.baseUrl}/gameday/matches/${match.id}/score`, match); }
  standings(tournamentId: string, format: string): Observable<Standing[]> { return this.http.get<Standing[]>(`${this.baseUrl}/gameday/${tournamentId}/${format}/standings`); }

  playerScoreLookup(tournamentId: string, format: string, phone: string): Observable<PlayerScoreLookupResponse> {
    return this.http.get<PlayerScoreLookupResponse>(`${this.baseUrl}/player-score/lookup?tournamentId=${encodeURIComponent(tournamentId)}&format=${encodeURIComponent(format)}&phone=${encodeURIComponent(phone)}`);
  }
  playerSaveBoard(matchId: string, boardNumber: number, team1Score: number | null, team2Score: number | null, phone: string, auditMeta: any = {}): Observable<Match> {
    return this.http.post<Match>(`${this.baseUrl}/player-score/matches/${matchId}/boards/${boardNumber}`, { team1Score, team2Score, phone, ...auditMeta });
  }
  playerFinalizeScore(match: Match, phone: string, auditMeta: any = {}): Observable<Match> {
    return this.http.post<Match>(`${this.baseUrl}/player-score/matches/${match.id}/finalize?phone=${encodeURIComponent(phone)}`, {
      phone,
      player1BoardScores: match.player1BoardScores || [],
      player2BoardScores: match.player2BoardScores || [],
      ...auditMeta
    });
  }
  auditHistory(tournamentId: string, format: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/audits/${encodeURIComponent(tournamentId)}/${encodeURIComponent(format)}`);
  }
  saveStandingAdjustment(tournamentId: string, format: string, adjustment: any, pin: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/standings-adjustments/${encodeURIComponent(tournamentId)}/${encodeURIComponent(format)}?pin=${encodeURIComponent(pin)}`, adjustment);
  }
  deleteSelectedRound(tournamentId: string, format: string, roundType: string, roundNumber: number, pin: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/gameday/${tournamentId}/${format}/round?roundType=${encodeURIComponent(roundType)}&roundNumber=${roundNumber}&pin=${encodeURIComponent(pin)}`)
      .pipe(tap(() => this.clearDashboardCache()));
  }
  updateMatchBoard(matchId: string, boardNumber: string, venueName: string, pin: string): Observable<Match> {
    return this.http.put<Match>(`${this.baseUrl}/gameday/matches/${matchId}/board?pin=${encodeURIComponent(pin)}`, { boardNumber, venueName });
  }

}
