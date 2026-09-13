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
import java.time.Instant;
import java.util.Comparator;

@RestController
@RequestMapping("/api/tournaments")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class TournamentController {
    private final TournamentRepository repository;
    private final RegistrationRepository registrationRepository;
    private final MatchRepository matchRepository;

    @GetMapping
    public List<Tournament> all() {
        return repository.findAll().stream().filter(this::isActiveTournament).toList();
    }

    @GetMapping("/by-pin")
    public List<Tournament> byPin(@RequestParam(defaultValue = "") String pin) {
        if (isSuperAdminPin(pin)) return repository.findAll().stream().filter(this::isActiveTournament).toList();
        if (pin == null || pin.isBlank()) return List.of();
        return repository.findByAdminPin(pin).stream().filter(this::isActiveTournament).toList();
    }



    @GetMapping("/dashboard")
    public List<DashboardTournament> dashboardTournaments() {
        return repository.findAll().stream()
                .filter(this::isActiveTournament)
                .filter(t -> !Boolean.TRUE.equals(t.getHiddenFromDashboard()))
                .sorted(Comparator.comparing(t -> t.getTournamentDate() == null ? java.time.LocalDate.MAX : t.getTournamentDate()))
                .map(tournament -> {
            List<Match> tournamentMatches = matchRepository.findActiveByTournamentIdOrderByRoundNumberAscBoardNumberAsc(tournament.getId());
            Optional<Match> finalWinner = tournamentMatches.stream()
                    .filter(m -> "FINALS".equalsIgnoreCase(m.getRoundType()))
                    .filter(m -> Boolean.TRUE.equals(m.getScoreFinalized()))
                    .filter(m -> m.getWinnerId() != null && !m.getWinnerId().isBlank())
                    .findFirst();
            boolean srrStarted = tournamentMatches.stream()
                    .anyMatch(m -> "SRR".equalsIgnoreCase(m.getRoundType()));

            return new DashboardTournament(
                    tournament,
                    finalWinner.isPresent() || "COMPLETED".equalsIgnoreCase(tournament.getStatus()),
                    finalWinner.map(this::winnerName).orElse(null),
                    finalWinner.map(Match::getFormat).orElse(null),
                    srrStarted
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
        normalizeDiscountOptions(tournament);
        tournament.setRecordStatus("ACTIVE");
        tournament.setDeletedAt(null);
        tournament.setDeletedBy(null);
        return ResponseEntity.ok(repository.save(tournament));
    }

    @GetMapping("/{id}")
    public Tournament get(@PathVariable String id) {
        return repository.findById(id).filter(this::isActiveTournament).orElseThrow();
    }


    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id,
                                    @RequestParam(defaultValue = "") String pin,
                                    @Valid @RequestBody Tournament request) {
        Tournament existing = repository.findById(id).filter(this::isActiveTournament).orElseThrow();
        if (!isAdminPin(pin, existing)) {
            return ResponseEntity.status(403).body(Map.of("message", "Invalid admin PIN"));
        }
        existing.setName(request.getName());
        existing.setTournamentType(request.getTournamentType());
        existing.setPlayersPerTeam(request.getPlayersPerTeam());
        existing.setTeamName(request.getTeamName());
        existing.setTeamPlayerNames(request.getTeamPlayerNames());
        existing.setTournamentDate(request.getTournamentDate());
        existing.setTournamentEndDate(request.getTournamentEndDate());
        existing.setTournamentStartTime(request.getTournamentStartTime());
        existing.setTournamentEndTime(request.getTournamentEndTime());
        existing.setRegistrationFee(request.getRegistrationFee() == null ? 0.0 : request.getRegistrationFee());
        existing.setVenueName(request.getVenueName());
        existing.setAddress(request.getAddress());
        existing.setTotalNumberOfPlayers(request.getTotalNumberOfPlayers());
        existing.setSrrRounds(request.getSrrRounds());
        existing.setKnockoutRounds(request.getKnockoutRounds());
        existing.setDescription(request.getDescription());
        existing.setFlyerUrl(request.getFlyerUrl());
        existing.setLiveUrl(request.getLiveUrl());
        existing.setFormats(request.getFormats());
        existing.setDiscountOptions(request.getDiscountOptions());
        normalizeDiscountOptions(existing);
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            existing.setStatus(request.getStatus());
        }
        return ResponseEntity.ok(repository.save(existing));
    }

    @PutMapping("/{id}/finalize")
    public ResponseEntity<?> finalizeTournament(@PathVariable String id, @RequestParam(defaultValue = "") String pin) {
        Tournament tournament = repository.findById(id).filter(this::isActiveTournament).orElseThrow();
        if (!isAdminPin(pin, tournament)) return ResponseEntity.status(403).body("Invalid admin PIN");
        tournament.setStatus("COMPLETED");
        tournament.setCompletedAt(Instant.now().toString());
        return ResponseEntity.ok(repository.save(tournament));
    }

    @PutMapping("/{id}/reopen")
    public ResponseEntity<?> reopenTournament(@PathVariable String id, @RequestParam(defaultValue = "") String pin) {
        Tournament tournament = repository.findById(id).filter(this::isActiveTournament).orElseThrow();
        if (!isAdminPin(pin, tournament)) return ResponseEntity.status(403).body("Invalid admin PIN");
        tournament.setStatus("OPEN"); tournament.setCompletedAt(null);
        return ResponseEntity.ok(repository.save(tournament));
    }


    @PutMapping("/{id}/dashboard-visibility")
    public ResponseEntity<?> setDashboardVisibility(
            @PathVariable String id,
            @RequestParam boolean hidden,
            @RequestParam(defaultValue = "") String pin) {
        if (!isSuperAdminPin(pin)) {
            return ResponseEntity.status(403).body(Map.of("message", "Super Admin PIN required"));
        }
        Tournament tournament = repository.findById(id).filter(this::isActiveTournament).orElseThrow();
        tournament.setHiddenFromDashboard(hidden);
        return ResponseEntity.ok(repository.save(tournament));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id, @RequestParam(defaultValue = "") String pin) {
        Tournament tournament = repository.findById(id).filter(this::isActiveTournament).orElseThrow();
        if (!isAdminPin(pin, tournament)) return ResponseEntity.status(403).body("Invalid admin PIN");
        tournament.setRecordStatus("D");
        tournament.setDeletedAt(Instant.now().toString());
        tournament.setDeletedBy(normalizePin(pin));
        tournament.setHiddenFromDashboard(true);
        repository.save(tournament);
        return ResponseEntity.ok(Map.of("deleted", true, "softDeleted", true, "tournamentId", id));
    }

    private boolean isActiveTournament(Tournament tournament) {
        return tournament != null && !"D".equalsIgnoreCase(tournament.getRecordStatus());
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
