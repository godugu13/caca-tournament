package com.caca.tournament.repository;

import com.caca.tournament.model.Registration;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface RegistrationRepository extends MongoRepository<Registration, String> {
    List<Registration> findByTournamentId(String tournamentId);
    List<Registration> findByTournamentIdAndRecordStatusNot(String tournamentId, String recordStatus);
    List<Registration> findByTournamentIdAndFormat(String tournamentId, String format);
    List<Registration> findByTournamentIdAndFormatAndRecordStatusNot(String tournamentId, String format, String recordStatus);
    List<Registration> findByTournamentIdAndFormatAndAttendedTrue(String tournamentId, String format);
    List<Registration> findByTournamentIdAndFormatAndAttendedTrueAndRecordStatusNot(String tournamentId, String format, String recordStatus);

    // Global lookup across all tournaments. This is intentionally NOT filtered by tournamentId.
    Optional<Registration> findFirstByEmailIgnoreCase(String email);

    void deleteByTournamentId(String tournamentId);
}
