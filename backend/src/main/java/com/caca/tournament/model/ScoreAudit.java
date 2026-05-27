package com.caca.tournament.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document("score_audits")
public class ScoreAudit {
    @Id
    private String id;
    private String matchId;
    private String tournamentId;
    private String format;
    private String roundType;
    private int roundNumber;
    private String boardNumber;
    private String updatedByPhone;
    private String updatedByRole;
    private String actionType;
    private String geoLocation;
    private Double longitude;
    private Double latitude;
    private String os;
    private String browser;
    private String deviceInfo;
    private String userAgent;
    private String ipAddress;
    private Integer player1Score;
    private Integer player2Score;
    private Boolean finalized;
    private Instant createdAt = Instant.now();
}
