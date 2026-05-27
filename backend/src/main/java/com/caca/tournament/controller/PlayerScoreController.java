
package com.caca.tournament.controller;

import com.caca.tournament.dto.BoardScoreRequest;
import com.caca.tournament.dto.ScoreAuditMetaRequest;
import com.caca.tournament.dto.PlayerScoreFinalizeRequest;
import com.caca.tournament.dto.PlayerScoreLookupResponse;
import com.caca.tournament.model.Match;
import com.caca.tournament.service.PlayerScoreService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.util.Map;

@RestController
@RequestMapping("/api/player-score")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class PlayerScoreController {
    private final PlayerScoreService playerScoreService;

    @GetMapping("/lookup")
    public PlayerScoreLookupResponse lookup(@RequestParam String tournamentId,
                                            @RequestParam String format,
                                            @RequestParam String phone) {
        return playerScoreService.lookup(tournamentId, format, phone);
    }

    @PostMapping("/matches/{matchId}/boards/{boardNumber}")
    public ResponseEntity<?> saveBoard(@PathVariable String matchId,
                                       @PathVariable int boardNumber,
                                       @RequestBody BoardScoreRequest request,
                                       HttpServletRequest httpRequest) {
        try {
            return ResponseEntity.ok(playerScoreService.saveBoard(matchId, boardNumber, request, httpRequest));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(403).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/matches/{matchId}/finalize")
    public ResponseEntity<?> finalizeScore(@PathVariable String matchId,
                                           @RequestParam String phone,
                                           @RequestBody(required = false) PlayerScoreFinalizeRequest meta,
                                           HttpServletRequest httpRequest) {
        try {
            return ResponseEntity.ok(playerScoreService.finalizeMatch(matchId, phone, meta, httpRequest));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(403).body(Map.of("message", ex.getMessage()));
        }
    }
}
