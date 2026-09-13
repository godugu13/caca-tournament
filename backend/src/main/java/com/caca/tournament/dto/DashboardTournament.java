package com.caca.tournament.dto;

import com.caca.tournament.model.Tournament;
import lombok.Data;

@Data
public class DashboardTournament {
    private Tournament tournament;
    private boolean championDeclared;
    private String championName;
    private String championFormat;
    private boolean srrStarted;

    public DashboardTournament(Tournament tournament, boolean championDeclared, String championName, String championFormat, boolean srrStarted) {
        this.tournament = tournament;
        this.championDeclared = championDeclared;
        this.championName = championName;
        this.championFormat = championFormat;
        this.srrStarted = srrStarted;
    }
}
