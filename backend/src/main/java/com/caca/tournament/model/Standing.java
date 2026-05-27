package com.caca.tournament.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Standing {
    private String playerId;
    private String playerName;
    private int wins;
    private int pointsFor;
    private int pointsAgainst;
    private int pointsDifferential;
    private int rank;
}
