package com.caca.tournament.controller;

import com.caca.tournament.model.ScoreAudit;
import com.caca.tournament.repository.ScoreAuditRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audits")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class ScoreAuditController {
    private final ScoreAuditRepository repository;

    @GetMapping("/match/{matchId}")
    public List<ScoreAudit> byMatch(@PathVariable String matchId) {
        return repository.findByMatchIdOrderByCreatedAtDesc(matchId);
    }

    @GetMapping("/{tournamentId}/{format}")
    public List<ScoreAudit> byTournamentFormat(@PathVariable String tournamentId, @PathVariable String format) {
        return repository.findByTournamentIdAndFormatOrderByCreatedAtDesc(tournamentId, format);
    }
}
