package com.caca.tournament.dto;

import java.util.List;

public class PlayerScoreFinalizeRequest extends ScoreAuditMetaRequest {
    private List<Integer> player1BoardScores;
    private List<Integer> player2BoardScores;

    public List<Integer> getPlayer1BoardScores() { return player1BoardScores; }
    public void setPlayer1BoardScores(List<Integer> player1BoardScores) { this.player1BoardScores = player1BoardScores; }

    public List<Integer> getPlayer2BoardScores() { return player2BoardScores; }
    public void setPlayer2BoardScores(List<Integer> player2BoardScores) { this.player2BoardScores = player2BoardScores; }
}
