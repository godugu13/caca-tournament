package com.caca.tournament.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document("standing_adjustments")
public class StandingAdjustment {
    @Id
    private String id;
    private String tournamentId;
    private String format;
    private String playerId;
    private String playerName;
    private Integer winsAdjustment = 0;
    private Integer pointsDifferentialAdjustment = 0;
    private String reason;
    private String updatedBy;
    private Instant updatedAt = Instant.now();
}
