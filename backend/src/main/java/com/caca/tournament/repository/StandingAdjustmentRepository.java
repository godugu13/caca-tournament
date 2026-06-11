package com.caca.tournament.repository;

import com.caca.tournament.model.StandingAdjustment;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface StandingAdjustmentRepository extends MongoRepository<StandingAdjustment, String> {
    List<StandingAdjustment> findByTournamentIdAndFormat(String tournamentId, String format);
    Optional<StandingAdjustment> findByTournamentIdAndFormatAndPlayerId(String tournamentId, String format, String playerId);
    void deleteByTournamentId(String tournamentId);
}
