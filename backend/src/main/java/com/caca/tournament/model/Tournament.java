package com.caca.tournament.model;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Document("tournaments")
public class Tournament {
    @Id
    private String id;
    @NotBlank
    private String name;
    private String tournamentType = "Singles"; // Singles, Doubles, Mixed Doubles, Team Event
    private Integer playersPerTeam;
    private String teamName;
    private List<String> teamPlayerNames = new ArrayList<>();
    private LocalDate tournamentDate;
    private LocalDate tournamentEndDate;
    private Double registrationFee = 0.0;
    private String venueName;
    private String address;
    private Integer totalNumberOfPlayers;
    private int srrRounds = 5;
    private int knockoutRounds = 1;
    private String description;
    private String adminPin = "1123";
    private List<String> formats = new ArrayList<>();
    private String status = "OPEN";

    private List<DiscountOption> discountOptions = new ArrayList<>();

    @Data
    public static class DiscountOption {
        private String type;
        private String label;
        private Double amount = 0.0;
        private Boolean enabled = false;
        private List<String> eligibleNames = new ArrayList<>();
    }

}
