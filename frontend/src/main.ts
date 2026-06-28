import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Routes, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AppComponent } from './app/app.component';
import { DashboardComponent } from './app/pages/dashboard/dashboard.component';
import { TournamentsComponent } from './app/pages/tournaments/tournaments.component';
import { RegistrationsComponent } from './app/pages/registrations/registrations.component';
import { GamedayComponent } from './app/pages/gameday/gameday.component';
import { ScoresComponent } from './app/pages/scores/scores.component';
import { StandingsComponent } from './app/pages/standings/standings.component';
import { BracketsComponent } from './app/pages/brackets/brackets.component';
import { AdminLoginComponent } from './app/pages/admin-login/admin-login.component';
import { AuditHistoryComponent } from './app/pages/audit-history/audit-history.component';
import { DeploymentSettingsComponent } from './app/pages/deployment-settings/deployment-settings.component';
import { PlayerScoreComponent } from './app/pages/player-score/player-score.component';

const adminGuard: CanActivateFn = (route, state) => {
  return sessionStorage.getItem('cacaAdminUnlocked') === 'true'
    ? true
    : inject(Router).createUrlTree(['/admin-login'], { queryParams: { returnUrl: state.url } });
};

const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'tournaments', component: TournamentsComponent, canActivate: [adminGuard] },
  { path: 'registrations', component: RegistrationsComponent },
  { path: 'gameday', component: GamedayComponent, canActivate: [adminGuard] },
  { path: 'scores', component: ScoresComponent, canActivate: [adminGuard] },
  { path: 'player-score', component: PlayerScoreComponent },
  { path: 'admin-login', component: AdminLoginComponent },
  { path: 'audit-history', component: AuditHistoryComponent, canActivate: [adminGuard] },
  { path: 'deployment-settings', component: DeploymentSettingsComponent, canActivate: [adminGuard] },
  { path: 'brackets', component: BracketsComponent },
  { path: 'brackets/:tournamentId/:format', component: BracketsComponent },
  { path: 'standings', component: StandingsComponent },
  { path: 'standings/:tournamentId/:format', component: StandingsComponent }
];

bootstrapApplication(AppComponent, { providers: [provideHttpClient(), provideRouter(routes)] })
  .catch(err => console.error(err));
