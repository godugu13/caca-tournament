export interface Tournament {
  id?: string;
  name: string;
  tournamentType?: string;
  playersPerTeam?: number;
  teamName?: string;
  teamPlayerNames?: string[];
  description?: string;
  tournamentDate?: string;
  registrationFee?: number;
  venueName?: string;
  address?: string;
  totalNumberOfPlayers?: number;
  srrRounds: number;
  knockoutRounds?: number;
  formats: string[];
  adminPin?: string;
  status?: string;
  winnerId?: string;
}
export interface Registration {
  id?: string;
  tournamentId: string;
  playerName: string;
  membershipId?: string;
  playerMemberId?: string;
  email?: string;
  phone?: string;
  format: string;
  partnerName?: string;
  captainName?: string;
  teamMemberNames?: string[];
  attended?: boolean;
  paymentStatus?: string;
  seedRank?: string;
}
export interface Match {
  id?: string;
  tournamentId: string;
  format: string;
  roundType?: string;
  roundGroup?: string;
  roundNumber: number;
  boardNumber?: string;
  venueName?: string;
  player1Rank?: number;
  player2Rank?: number;
  player1Id?: string;
  player1Name?: string;
  player1Emails?: string[];
  player1Phones?: string[];
  player2Id?: string;
  player2Name?: string;
  player2Emails?: string[];
  player2Phones?: string[];
  player1Score?: number;
  player2Score?: number;
  player1BoardScores?: number[];
  player2BoardScores?: number[];
  scoreFinalized?: boolean;
  status?: string;
  winnerId?: string;
}
export interface Standing { playerId?: string; rank: number; playerName: string; wins: number; pointsFor: number; pointsAgainst: number; pointsDifferential: number; }

export interface Member { id?: string; membershipId: string; sequenceNumber?: number; name: string; email?: string; phone?: string; }

export interface PlayerScoreLookupResponse {
  found: boolean;
  message?: string;
  tournamentId?: string;
  format?: string;
  roundLabel?: string;
  venue?: string;
  match?: Match;
  allowedPlayers?: string[];
  accessibleMatches?: Match[];
}

export interface DashboardTournament {
  tournament: Tournament;
  championDeclared: boolean;
  championName?: string;
  championFormat?: string;
}
