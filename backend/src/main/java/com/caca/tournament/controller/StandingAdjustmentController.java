package com.caca.tournament.controller;

import com.caca.tournament.model.StandingAdjustment;
import com.caca.tournament.repository.StandingAdjustmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/standings-adjustments")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class StandingAdjustmentController {
    private final StandingAdjustmentRepository repository;

    @GetMapping("/{tournamentId}/{format}")
    public List<StandingAdjustment> get(@PathVariable String tournamentId, @PathVariable String format) {
        return repository.findByTournamentIdAndFormat(tournamentId, format);
    }

    @PostMapping("/{tournamentId}/{format}")
    public ResponseEntity<?> save(@PathVariable String tournamentId,
                                  @PathVariable String format,
                                  @RequestParam(defaultValue = "") String pin,
                                  @RequestBody StandingAdjustment request) {
        if (!"1123".equals(pin)) {
            return ResponseEntity.status(403).body(Map.of("message", "Only Super Admin Raju Godugu can update standings adjustments."));
        }
        if (request.getPlayerId() == null || request.getPlayerId().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "playerId is required"));
        }

        StandingAdjustment adjustment = repository
                .findByTournamentIdAndFormatAndPlayerId(tournamentId, format, request.getPlayerId())
                .orElseGet(StandingAdjustment::new);

        adjustment.setTournamentId(tournamentId);
        adjustment.setFormat(format);
        adjustment.setPlayerId(request.getPlayerId());
        adjustment.setPlayerName(request.getPlayerName());
        adjustment.setWinsAdjustment(request.getWinsAdjustment() == null ? 0 : request.getWinsAdjustment());
        adjustment.setPointsDifferentialAdjustment(request.getPointsDifferentialAdjustment() == null ? 0 : request.getPointsDifferentialAdjustment());
        adjustment.setReason(request.getReason());
        adjustment.setUpdatedBy("Raju Godugu");
        adjustment.setUpdatedAt(Instant.now());

        return ResponseEntity.ok(repository.save(adjustment));
    }
}
