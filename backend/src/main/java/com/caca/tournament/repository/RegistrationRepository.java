package com.caca.tournament.repository;

import com.caca.tournament.model.Registration;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface RegistrationRepository extends MongoRepository<Registration, String> {
    List<Registration> findByTournamentId(String tournamentId);
    List<Registration> findByTournamentIdAndFormat(String tournamentId, String format);
    List<Registration> findByTournamentIdAndFormatAndAttendedTrue(String tournamentId, String format);

    // Global lookup across all tournaments. This is intentionally NOT filtered by tournamentId.
    Optional<Registration> findFirstByEmailIgnoreCase(String email);

    void deleteByTournamentId(String tournamentId);
}
