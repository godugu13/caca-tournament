package com.caca.tournament.controller;

import com.caca.tournament.model.Match;
import com.caca.tournament.model.Standing;
import com.caca.tournament.repository.MatchRepository;
import com.caca.tournament.repository.TournamentRepository;
import com.caca.tournament.service.SrrService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/gameday")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class GameDayController {
    private final SrrService srrService;
    private final MatchRepository matchRepository;
    private final TournamentRepository tournamentRepository;

    @PostMapping("/{tournamentId}/{format}/round/{roundNumber}/generate")
    public ResponseEntity<?> generate(@PathVariable String tournamentId, @PathVariable String format,
                                      @PathVariable int roundNumber, @RequestParam(defaultValue = "Board") String venueName) {
        try {
            return ResponseEntity.ok(srrService.generateSrrRound(tournamentId, format, roundNumber, venueName));
        } catch (IllegalStateException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PostMapping("/{tournamentId}/{format}/knockout/{stage}/generate")
    public ResponseEntity<?> generateKnockout(@PathVariable String tournamentId, @PathVariable String format,
                                               @PathVariable String stage,
                                               @RequestParam(defaultValue = "") String group) {
        try {
            return ResponseEntity.ok(srrService.generateKnockoutRound(tournamentId, format, stage, group));
        } catch (IllegalStateException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @GetMapping("/{tournamentId}/{format}/matches")
    public List<Match> matches(@PathVariable String tournamentId, @PathVariable String format,
                               @RequestParam(defaultValue = "") String playerLookup) {
        List<Match> matches = matchRepository.findByTournamentIdAndFormatOrderByRoundNumberAscBoardNumberAsc(tournamentId, format);
        if (playerLookup == null || playerLookup.isBlank()) return matches;
        String lookup = playerLookup.trim().toLowerCase();
        return matches.stream().filter(m ->
                containsIgnoreCase(m.getPlayer1Emails(), lookup) || containsIgnoreCase(m.getPlayer1Phones(), lookup) ||
                containsIgnoreCase(m.getPlayer2Emails(), lookup) || containsIgnoreCase(m.getPlayer2Phones(), lookup)
        ).toList();
    }

    private boolean containsIgnoreCase(List<String> values, String lookup) {
        if (values == null) return false;
        String normalizedLookup = lookup.replaceAll("[^0-9a-z@.]", "");
        return values.stream()
                .filter(java.util.Objects::nonNull)
                .map(v -> v.trim().toLowerCase().replaceAll("[^0-9a-z@.]", ""))
                .anyMatch(v -> v.equals(normalizedLookup));
    }

    @DeleteMapping("/{tournamentId}/{format}/matches")
    public ResponseEntity<?> deleteGeneratedRounds(@PathVariable String tournamentId, @PathVariable String format,
                                                   @RequestParam(defaultValue = "") String pin) {
        if (!"1123".equals(pin)) return ResponseEntity.status(403).body("Invalid admin PIN");
        matchRepository.deleteByTournamentIdAndFormat(tournamentId, format);
        return ResponseEntity.ok(Map.of("deleted", true, "tournamentId", tournamentId, "format", format));
    }

    @PutMapping("/matches/{matchId}/score")
    public Match score(@PathVariable String matchId, @RequestBody Match request) {
        Match match = matchRepository.findById(matchId).orElseThrow();

        boolean finalized = Boolean.TRUE.equals(request.getScoreFinalized());
        match.setScoreFinalized(finalized);

        if ("BYE".equalsIgnoreCase(match.getStatus())) {
            match.setPlayer1Score(request.getPlayer1Score() == null ? 0 : request.getPlayer1Score());
            match.setPlayer2Score(0);
            match.setWinnerId(finalized ? match.getPlayer1Id() : null);
            return matchRepository.save(match);
        }

        if (request.getPlayer1BoardScores() != null) {
            match.setPlayer1BoardScores(request.getPlayer1BoardScores());
        }
        if (request.getPlayer2BoardScores() != null) {
            match.setPlayer2BoardScores(request.getPlayer2BoardScores());
        }

        zeroMissingOpponentScores(match);
        int player1Total = cappedTotal(match.getPlayer1BoardScores());
        int player2Total = cappedTotal(match.getPlayer2BoardScores());
        match.setPlayer1Score(player1Total);
        match.setPlayer2Score(player2Total);
        match.setStatus(finalized ? "COMPLETED" : "IN_PROGRESS");

        if (finalized) {
            if (player1Total > player2Total) match.setWinnerId(match.getPlayer1Id());
            else if (player2Total > player1Total) match.setWinnerId(match.getPlayer2Id());
            else match.setWinnerId(null);
        } else {
            match.setWinnerId(null);
        }
        Match saved = matchRepository.save(match);
        markTournamentCompletedIfFinalChampion(saved);
        return saved;
    }

    private void markTournamentCompletedIfFinalChampion(Match match) {
        if (match == null) return;
        if (!Boolean.TRUE.equals(match.getScoreFinalized())) return;
        if (match.getWinnerId() == null || match.getWinnerId().isBlank()) return;
        if (!"FINALS".equalsIgnoreCase(match.getRoundType())) return;
        tournamentRepository.findById(match.getTournamentId()).ifPresent(tournament -> {
            tournament.setStatus("COMPLETED");
            tournamentRepository.save(tournament);
        });
    }

    private void zeroMissingOpponentScores(Match match) {
        List<Integer> p1 = match.getPlayer1BoardScores();
        List<Integer> p2 = match.getPlayer2BoardScores();
        if (p1 == null || p2 == null) return;
        int max = Math.min(p1.size(), p2.size());
        for (int i = 0; i < max; i++) {
            Integer a = p1.get(i);
            Integer b = p2.get(i);
            if (a != null && b == null) p2.set(i, 0);
            if (b != null && a == null) p1.set(i, 0);
        }
    }

    private int sumScores(List<Integer> scores) {
        if (scores == null) return 0;
        return scores.stream().filter(java.util.Objects::nonNull).mapToInt(Integer::intValue).sum();
    }

    private int cappedTotal(List<Integer> scores) {
        return Math.min(25, sumScores(scores));
    }

    @GetMapping("/{tournamentId}/{format}/standings")
    public List<Standing> standings(@PathVariable String tournamentId, @PathVariable String format) {
        return srrService.calculateStandings(tournamentId, format);
    }
}
