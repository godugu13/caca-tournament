package com.caca.tournament.controller;

import com.caca.tournament.model.Tournament;
import com.caca.tournament.model.Match;
import com.caca.tournament.dto.DashboardTournament;
import com.caca.tournament.repository.MatchRepository;
import com.caca.tournament.repository.RegistrationRepository;
import com.caca.tournament.repository.TournamentRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Arrays;
import java.util.Optional;
import java.util.Map;

@RestController
@RequestMapping("/api/tournaments")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class TournamentController {
    private final TournamentRepository repository;
    private final RegistrationRepository registrationRepository;
    private final MatchRepository matchRepository;

    @GetMapping
    public List<Tournament> all() { return repository.findAll(); }

    @GetMapping("/by-pin")
    public List<Tournament> byPin(@RequestParam(defaultValue = "") String pin) {
        if (isSuperAdminPin(pin)) return repository.findAll();
        if (pin == null || pin.isBlank()) return List.of();
        return repository.findByAdminPin(pin);
    }



    @GetMapping("/dashboard")
    public List<DashboardTournament> dashboardTournaments() {
        return repository.findAll().stream().map(tournament -> {
            Optional<Match> finalWinner = matchRepository.findByTournamentIdOrderByRoundNumberAscBoardNumberAsc(tournament.getId())
                    .stream()
                    .filter(m -> "FINALS".equalsIgnoreCase(m.getRoundType()))
                    .filter(m -> Boolean.TRUE.equals(m.getScoreFinalized()))
                    .filter(m -> m.getWinnerId() != null && !m.getWinnerId().isBlank())
                    .findFirst();

            return new DashboardTournament(
                    tournament,
                    finalWinner.isPresent(),
                    finalWinner.map(this::winnerName).orElse(null),
                    finalWinner.map(Match::getFormat).orElse(null)
            );
        }).toList();
    }

    private String winnerName(Match match) {
        if (match == null || match.getWinnerId() == null) return null;
        if (match.getWinnerId().equals(match.getPlayer1Id())) return match.getPlayer1Name();
        if (match.getWinnerId().equals(match.getPlayer2Id())) return match.getPlayer2Name();
        return null;
    }


    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody Tournament tournament) {
        String pin = normalizePin(tournament.getAdminPin());
        if (pin.isBlank()) return ResponseEntity.badRequest().body("Admin PIN is required");
        if (!isSuperAdminPin(pin) && repository.existsByAdminPin(pin)) {
            return ResponseEntity.badRequest().body("This Admin PIN is already used by another organizer. Please choose a different PIN.");
        }
        tournament.setAdminPin(pin);
        return ResponseEntity.ok(repository.save(tournament));
    }

    @GetMapping("/{id}")
    public Tournament get(@PathVariable String id) { return repository.findById(id).orElseThrow(); }


    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @Valid @RequestBody Tournament request) {
        Tournament existing = repository.findById(id).orElseThrow();
        existing.setName(request.getName());
        existing.setTournamentType(request.getTournamentType());
        existing.setPlayersPerTeam(request.getPlayersPerTeam());
        existing.setTeamName(request.getTeamName());
        existing.setTeamPlayerNames(request.getTeamPlayerNames());
        existing.setTournamentDate(request.getTournamentDate());
        existing.setRegistrationFee(request.getRegistrationFee() == null ? 0.0 : request.getRegistrationFee());
        existing.setVenueName(request.getVenueName());
        existing.setAddress(request.getAddress());
        existing.setTotalNumberOfPlayers(request.getTotalNumberOfPlayers());
        existing.setSrrRounds(request.getSrrRounds());
        existing.setKnockoutRounds(request.getKnockoutRounds());
        existing.setDescription(request.getDescription());
        existing.setFormats(request.getFormats());
        if (request.getAdminPin() != null && !request.getAdminPin().isBlank()) {
            String requestedPin = normalizePin(request.getAdminPin());
            if (!requestedPin.equals(existing.getAdminPin()) && !isSuperAdminPin(requestedPin) && repository.existsByAdminPin(requestedPin)) {
                return ResponseEntity.badRequest().body("This Admin PIN is already used by another organizer. Please choose a different PIN.");
            }
            existing.setAdminPin(requestedPin);
        }
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            existing.setStatus(request.getStatus());
        }
        return ResponseEntity.ok(repository.save(existing));
    }

    @PutMapping("/{id}/finalize")
    public ResponseEntity<?> finalizeTournament(@PathVariable String id, @RequestParam(defaultValue = "") String pin) {
        Tournament tournament = repository.findById(id).orElseThrow();
        if (!isAdminPin(pin, tournament)) return ResponseEntity.status(403).body("Invalid admin PIN");
        tournament.setStatus("COMPLETED");
        return ResponseEntity.ok(repository.save(tournament));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id, @RequestParam(defaultValue = "") String pin) {
        Tournament tournament = repository.findById(id).orElseThrow();
        if (!isAdminPin(pin, tournament)) return ResponseEntity.status(403).body("Invalid admin PIN");
        matchRepository.deleteByTournamentId(id);
        registrationRepository.deleteByTournamentId(id);
        repository.deleteById(id);
        return ResponseEntity.ok(Map.of("deleted", true, "tournamentId", id));
    }

    private String normalizePin(String pin) {
        return pin == null ? "" : pin.replaceAll("[^0-9]", "").trim();
    }

    private boolean isSuperAdminPin(String pin) {
        return "1123".equals(normalizePin(pin));
    }

    private boolean isAdminPin(String pin, Tournament tournament) {
        String normalized = normalizePin(pin);
        if (isSuperAdminPin(normalized)) return true;
        return tournament != null && tournament.getAdminPin() != null && tournament.getAdminPin().equals(normalized);
    }
    private void normalizeDiscountOptions(Tournament tournament) {
        if (tournament.getDiscountOptions() == null) return;
        tournament.getDiscountOptions().forEach(d -> {
            if ((d.getEligibleNames() == null || d.getEligibleNames().isEmpty())
                    && d.getEligibleNamesText() != null && !d.getEligibleNamesText().isBlank()) {
                d.setEligibleNames(Arrays.stream(d.getEligibleNamesText().split("[\\n,]+"))
                        .map(String::trim)
                        .filter(s -> !s.isBlank())
                        .toList());
            }
        });
    }


}
