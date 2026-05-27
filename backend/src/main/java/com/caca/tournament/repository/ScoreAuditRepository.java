package com.caca.tournament.repository;

import com.caca.tournament.model.ScoreAudit;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ScoreAuditRepository extends MongoRepository<ScoreAudit, String> {
    List<ScoreAudit> findByMatchIdOrderByCreatedAtDesc(String matchId);
    List<ScoreAudit> findByTournamentIdAndFormatOrderByCreatedAtDesc(String tournamentId, String format);
}
