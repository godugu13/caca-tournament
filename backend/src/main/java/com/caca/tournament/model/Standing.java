package com.caca.tournament.model;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class Standing {
    public Standing(String playerId, String playerName, int wins, int pointsFor, int pointsAgainst, int pointsDifferential, int rank) {
        this.playerId = playerId;
        this.playerName = playerName;
        this.wins = wins;
        this.pointsFor = pointsFor;
        this.pointsAgainst = pointsAgainst;
        this.pointsDifferential = pointsDifferential;
        this.rank = rank;
    }

    private String playerId;
    private String playerName;
    private int wins;
    private int pointsFor;
    private int pointsAgainst;
    private int pointsDifferential;
    private int rank;
    private int winsAdjustment;
    private int pointsDifferentialAdjustment;
    private String adjustmentReason;
}
