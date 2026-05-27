package com.caca.tournament.repository;

import com.caca.tournament.model.Match;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface MatchRepository extends MongoRepository<Match, String> {
    List<Match> findByTournamentIdAndFormatOrderByRoundNumberAscBoardNumberAsc(String tournamentId, String format);
    List<Match> findByTournamentIdAndFormatAndRoundNumber(String tournamentId, String format, int roundNumber);
    void deleteByTournamentId(String tournamentId);
    void deleteByTournamentIdAndFormat(String tournamentId, String format);
    java.util.List<com.caca.tournament.model.Match> findByTournamentIdOrderByRoundNumberAscBoardNumberAsc(String tournamentId);
}
