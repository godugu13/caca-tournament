package com.caca.tournament.config;

import com.caca.tournament.model.Registration;
import com.caca.tournament.model.Tournament;
import com.caca.tournament.repository.RegistrationRepository;
import com.caca.tournament.repository.TournamentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {
    private final TournamentRepository tournamentRepository;
    private final RegistrationRepository registrationRepository;

    @Override public void run(String... args) {
        if (tournamentRepository.count() > 0) return;
        Tournament t = new Tournament();
        t.setName("CACA Inc Sample Tournament");
        t.setDescription("Capital Area Carrom Association tournament starter setup");
        t.setTournamentDate(LocalDate.now().plusDays(30));
        t.setVenueName("CACA Venue");
        t.setSrrRounds(5);
        t.setFormats(List.of("Singles", "Doubles", "Mixed Doubles"));
        t.setStatus("OPEN");
        Tournament saved = tournamentRepository.save(t);
        for (String name : List.of("Raju Godugu", "Pranay Mehta", "Premal Patwa", "Ziyard Bhave", "Kishore Tallapragada", "Aditya Prasad")) {
            Registration r = new Registration();
            r.setTournamentId(saved.getId()); r.setPlayerName(name); r.setFormat("Singles"); r.setPaymentStatus("PAID");
            registrationRepository.save(r);
        }
    }
}
