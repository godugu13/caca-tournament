package com.caca.tournament.repository;

import com.caca.tournament.model.Tournament;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TournamentRepository extends MongoRepository<Tournament, String> {
    java.util.List<com.caca.tournament.model.Tournament> findByAdminPin(String adminPin);
    boolean existsByAdminPin(String adminPin);
}
