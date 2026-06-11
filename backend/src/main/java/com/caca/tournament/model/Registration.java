package com.caca.tournament.model;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Data
@Document("registrations")
public class Registration {
    @Id
    private String id;
    @NotBlank
    private String tournamentId;
    @NotBlank
    private String playerName;
    private String membershipId;
    private String playerMemberId;
    private String email;
    private String phone;
    private String format = "Singles";
    private String partnerName;
    private String captainName;
    private List<String> teamMemberNames = new ArrayList<>();
    private Boolean attended = false;
    private String paymentStatus = "PENDING";
    private String seedRank;
    private String discountType;
    private String discountLabel;
    private String discountName;
    private String gender;
    private Double discountAmount = 0.0;
    private Double finalFee = 0.0;
}
