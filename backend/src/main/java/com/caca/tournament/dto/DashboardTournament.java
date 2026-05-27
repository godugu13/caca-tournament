package com.caca.tournament.dto;

import com.caca.tournament.model.Tournament;
import lombok.Data;

@Data
public class DashboardTournament {
    private Tournament tournament;
    private boolean championDeclared;
    private String championName;
    private String championFormat;

    public DashboardTournament(Tournament tournament, boolean championDeclared, String championName, String championFormat) {
        this.tournament = tournament;
        this.championDeclared = championDeclared;
        this.championName = championName;
        this.championFormat = championFormat;
    }
}
