
package com.caca.tournament.dto;

import com.caca.tournament.model.Match;
import java.util.List;

public class PlayerScoreLookupResponse {
    private boolean found;
    private String message;
    private String tournamentId;
    private String format;
    private String roundLabel;
    private String venue;
    private Match match;
    private List<String> allowedPlayers;
    private List<Match> accessibleMatches;

    public PlayerScoreLookupResponse() {}

    public static PlayerScoreLookupResponse notFound(String message) {
        PlayerScoreLookupResponse response = new PlayerScoreLookupResponse();
        response.setFound(false);
        response.setMessage(message);
        return response;
    }

    public static PlayerScoreLookupResponse found(String tournamentId, String format, String roundLabel,
                                                  String venue, Match match, List<String> allowedPlayers,
                                                  List<Match> accessibleMatches) {
        PlayerScoreLookupResponse response = new PlayerScoreLookupResponse();
        response.setFound(true);
        response.setMessage("Match found");
        response.setTournamentId(tournamentId);
        response.setFormat(format);
        response.setRoundLabel(roundLabel);
        response.setVenue(venue);
        response.setMatch(match);
        response.setAllowedPlayers(allowedPlayers);
        response.setAccessibleMatches(accessibleMatches);
        return response;
    }

    public boolean isFound() { return found; }
    public void setFound(boolean found) { this.found = found; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getTournamentId() { return tournamentId; }
    public void setTournamentId(String tournamentId) { this.tournamentId = tournamentId; }

    public String getFormat() { return format; }
    public void setFormat(String format) { this.format = format; }

    public String getRoundLabel() { return roundLabel; }
    public void setRoundLabel(String roundLabel) { this.roundLabel = roundLabel; }

    public String getVenue() { return venue; }
    public void setVenue(String venue) { this.venue = venue; }

    public Match getMatch() { return match; }
    public void setMatch(Match match) { this.match = match; }

    public List<String> getAllowedPlayers() { return allowedPlayers; }
    public void setAllowedPlayers(List<String> allowedPlayers) { this.allowedPlayers = allowedPlayers; }

    public List<Match> getAccessibleMatches() { return accessibleMatches; }
    public void setAccessibleMatches(List<Match> accessibleMatches) { this.accessibleMatches = accessibleMatches; }
}
