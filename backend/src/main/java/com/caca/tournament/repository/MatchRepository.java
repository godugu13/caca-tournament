package com.caca.tournament.repository;

import com.caca.tournament.model.Match;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface MatchRepository extends MongoRepository<Match, String> {
    List<Match> findByTournamentIdAndFormatOrderByRoundNumberAscBoardNumberAsc(String tournamentId, String format);
    List<Match> findByTournamentIdAndFormatAndRoundNumber(String tournamentId, String format, int roundNumber);
    java.util.List<com.caca.tournament.model.Match> findByTournamentIdOrderByRoundNumberAscBoardNumberAsc(String tournamentId);

    default java.util.List<com.caca.tournament.model.Match> findActiveByTournamentIdAndFormatOrderByRoundNumberAscBoardNumberAsc(String tournamentId, String format) {
        return findByTournamentIdAndFormatOrderByRoundNumberAscBoardNumberAsc(tournamentId, format)
                .stream()
                .filter(m -> !"D".equalsIgnoreCase(m.getRecordStatus()))
                .toList();
    }

    default java.util.List<com.caca.tournament.model.Match> findActiveByTournamentIdOrderByRoundNumberAscBoardNumberAsc(String tournamentId) {
        return findByTournamentIdOrderByRoundNumberAscBoardNumberAsc(tournamentId)
                .stream()
                .filter(m -> !"D".equalsIgnoreCase(m.getRecordStatus()))
                .toList();
    }

}
