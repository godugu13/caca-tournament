import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Match, Registration, Standing, Tournament, Member, PlayerScoreLookupResponse, DashboardTournament } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  // Step 28.5 deployment aware API URL.
  // Local testing:
  //   http://localhost:4200  -> http://localhost:8080/api
  //   http://192.x.x.x:4200  -> http://192.x.x.x:8080/api
  // Production:
  //   Set localStorage.cacaApiBaseUrl in browser if frontend/backend are on separate domains,
  //   or replace this with environment-based config in Step 29.
  private baseUrl = this.resolveApiBaseUrl();

  constructor(private http: HttpClient) {}

  private resolveApiBaseUrl(): string {
    const override = localStorage.getItem('cacaApiBaseUrl');
    if (override && override.trim()) return override.trim().replace(/\/$/, '');

    const host = window.location.hostname;
    const protocol = window.location.protocol;

    // Render/Railway/Vercel style: frontend and backend may be separate.
    // During beta, use localStorage override:
    // localStorage.setItem('cacaApiBaseUrl', 'https://your-backend-url.onrender.com/api')
    if (host !== 'localhost' && host !== '127.0.0.1' && !/^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) {
      return `${protocol}//${host}/api`;
    }

    return `${protocol}//${host}:8080/api`;
  }
  tournaments(): Observable<Tournament[]> { return this.http.get<Tournament[]>(`${this.baseUrl}/tournaments`); }
  tournamentsByPin(pin: string): Observable<Tournament[]> { return this.http.get<Tournament[]>(`${this.baseUrl}/tournaments/by-pin?pin=${encodeURIComponent(pin || '')}`); }
  dashboardTournaments(): Observable<DashboardTournament[]> { return this.http.get<DashboardTournament[]>(`${this.baseUrl}/tournaments/dashboard`); }
  createTournament(t: Tournament): Observable<Tournament> { return this.http.post<Tournament>(`${this.baseUrl}/tournaments`, t); }
  updateTournament(id: string, t: Tournament): Observable<Tournament> { return this.http.put<Tournament>(`${this.baseUrl}/tournaments/${id}`, t); }
  deleteTournament(tournamentId: string, pin: string): Observable<any> { return this.http.delete<any>(`${this.baseUrl}/tournaments/${tournamentId}?pin=${encodeURIComponent(pin)}`); }
  finalizeTournament(tournamentId: string, pin: string): Observable<Tournament> { return this.http.put<Tournament>(`${this.baseUrl}/tournaments/${tournamentId}/finalize?pin=${encodeURIComponent(pin)}`, {}); }
  registrations(tournamentId: string): Observable<Registration[]> { return this.http.get<Registration[]>(`${this.baseUrl}/registrations/tournament/${tournamentId}`); }
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

  deleteRegistration(registrationId: string, pin: string): Observable<any> { return this.http.delete<any>(`${this.baseUrl}/registrations/${registrationId}?pin=${encodeURIComponent(pin)}`); }
  deleteRegistrationsBulk(registrationIds: string[], pin: string): Observable<any> { return this.http.post<any>(`${this.baseUrl}/registrations/bulk-delete?pin=${encodeURIComponent(pin)}`, registrationIds); }
  updateAttendance(registrationId: string, attended: boolean): Observable<Registration> { return this.http.put<Registration>(`${this.baseUrl}/registrations/${registrationId}/attendance`, { attended }); }
  updatePaymentStatus(registrationId: string, paymentStatus: string): Observable<Registration> { return this.http.put<Registration>(`${this.baseUrl}/registrations/${registrationId}/payment`, { paymentStatus }); }
  generateRound(tournamentId: string, format: string, round: number, venue: string): Observable<Match[]> { return this.http.post<Match[]>(`${this.baseUrl}/gameday/${tournamentId}/${format}/round/${round}/generate?venueName=${encodeURIComponent(venue)}`, {}); }
  generateKnockout(tournamentId: string, format: string, stage: string, group: string = ''): Observable<Match[]> { return this.http.post<Match[]>(`${this.baseUrl}/gameday/${tournamentId}/${format}/knockout/${encodeURIComponent(stage)}/generate?group=${encodeURIComponent(group)}`, {}); }
  matches(tournamentId: string, format: string, playerLookup: string = ''): Observable<Match[]> { const q = playerLookup ? `?playerLookup=${encodeURIComponent(playerLookup)}` : ''; return this.http.get<Match[]>(`${this.baseUrl}/gameday/${tournamentId}/${format}/matches${q}`); }
  deleteGeneratedRounds(tournamentId: string, format: string, pin: string): Observable<any> { return this.http.delete<any>(`${this.baseUrl}/gameday/${tournamentId}/${format}/matches?pin=${encodeURIComponent(pin)}`); }
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
}
