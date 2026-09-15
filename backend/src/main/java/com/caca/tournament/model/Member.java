package com.caca.tournament.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

@Data
@Document("members")
public class Member {
    @Id
    private String id;
    private String membershipId;
    private long sequenceNumber;
    private String name;
    @Indexed
    private String email;
    private String phone;
}
