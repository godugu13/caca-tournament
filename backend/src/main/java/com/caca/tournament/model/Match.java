package com.caca.tournament.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Data
@Document("matches")
public class Match {
    @Id
    private String id;
    private String tournamentId;
    private String format;
    private String roundType = "SRR";
    private String roundGroup;
    private int roundNumber;
    private String boardNumber;
    private String venueName;
    private Integer player1Rank;
    private Integer player2Rank;
    private String player1Id;
    private String player1Name;
    private List<String> player1Emails = new ArrayList<>();
    private List<String> player1Phones = new ArrayList<>();
    private String player2Id;
    private String player2Name;
    private List<String> player2Emails = new ArrayList<>();
    private List<String> player2Phones = new ArrayList<>();

    // Final match totals used for standings.
    private Integer player1Score;
    private Integer player2Score;

    // Per-board scoring for a single match. In CACA games a match may have up to 8 boards.
    // Totals are calculated from these lists, and standings use the final totals.
    private List<Integer> player1BoardScores = new ArrayList<>();
    private List<Integer> player2BoardScores = new ArrayList<>();
    private Boolean scoreFinalized = false;

    private String winnerId;
    private String status = "SCHEDULED";
}
