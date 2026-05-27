
package com.caca.tournament.service;

import com.caca.tournament.dto.BoardScoreRequest;
import com.caca.tournament.dto.ScoreAuditMetaRequest;
import com.caca.tournament.dto.PlayerScoreFinalizeRequest;
import com.caca.tournament.dto.PlayerScoreLookupResponse;
import com.caca.tournament.model.Match;
import com.caca.tournament.model.Registration;
import com.caca.tournament.repository.MatchRepository;
import com.caca.tournament.repository.RegistrationRepository;
import com.caca.tournament.repository.TournamentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import jakarta.servlet.http.HttpServletRequest;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class PlayerScoreService {
    private final MatchRepository matchRepository;
    private final RegistrationRepository registrationRepository;
    private final TournamentRepository tournamentRepository;
    private final ScoreAuditService scoreAuditService;

    public PlayerScoreLookupResponse lookup(String tournamentId, String format, String phone) {
        String normalizedPhone = normalizePhone(phone);
        if (tournamentId == null || tournamentId.isBlank()) {
            return PlayerScoreLookupResponse.notFound("Tournament is required.");
        }
        if (format == null || format.isBlank()) {
            return PlayerScoreLookupResponse.notFound("Format is required.");
        }
        if (normalizedPhone.isBlank()) {
            return PlayerScoreLookupResponse.notFound("Please enter registered phone number.");
        }

        List<Match> allMatches = matchRepository.findByTournamentIdAndFormatOrderByRoundNumberAscBoardNumberAsc(tournamentId, format);
        List<Match> accessible = allMatches.stream()
                .filter(m -> phoneMatches(m, normalizedPhone))
                .sorted(Comparator.comparingInt(this::roundSortValue).thenComparing(m -> safeBoardNumber(m.getBoardNumber())))
                .toList();

        if (accessible.isEmpty()) {
            return PlayerScoreLookupResponse.notFound("No score card found for this phone number.");
        }

        Match current = accessible.stream()
                .filter(m -> !Boolean.TRUE.equals(m.getScoreFinalized()))
                .max(Comparator.comparingInt(this::roundSortValue).thenComparing(m -> safeBoardNumber(m.getBoardNumber())))
                .orElseGet(() -> accessible.stream()
                        .max(Comparator.comparingInt(this::roundSortValue).thenComparing(m -> safeBoardNumber(m.getBoardNumber())))
                        .orElse(accessible.get(accessible.size() - 1)));

        ensureBoardArrays(current);
        accessible.forEach(this::ensureBoardArrays);

        return PlayerScoreLookupResponse.found(
                tournamentId,
                format,
                roundLabel(current),
                current.getBoardNumber(),
                current,
                allowedPlayers(current),
                accessible
        );
    }

    public Match saveBoard(String matchId, int boardNumber, BoardScoreRequest request, HttpServletRequest httpRequest) {
        Match match = matchRepository.findById(matchId).orElseThrow();
        validatePhoneAccess(match, request == null ? null : request.getPhone(), false);
        ensureBoardArrays(match);

        int index = Math.max(0, Math.min(7, boardNumber - 1));
        Integer p1 = request == null ? null : request.getTeam1Score();
        Integer p2 = request == null ? null : request.getTeam2Score();

        if (p1 != null && p2 == null) p2 = 0;
        if (p2 != null && p1 == null) p1 = 0;
        if (p1 == null) p1 = 0;
        if (p2 == null) p2 = 0;

        match.getPlayer1BoardScores().set(index, p1);
        match.getPlayer2BoardScores().set(index, p2);
        calculateTotals(match);

        match.setScoreFinalized(false);
        match.setStatus("IN_PROGRESS");
        match.setWinnerId(null);
        Match saved = matchRepository.save(match);
        scoreAuditService.record(saved, request == null ? null : request.getPhone(), "PLAYER", httpRequest, toMeta(request, "SAVE"));
        return saved;
    }

    public Match finalizeMatch(String matchId, String phone, PlayerScoreFinalizeRequest meta, HttpServletRequest httpRequest) {
        Match match = matchRepository.findById(matchId).orElseThrow();
        validatePhoneAccess(match, phone, false);
        ensureBoardArrays(match);

        // Step 29.3F:
        // Finalize must use the same board scores the player currently sees/entered.
        // If player entered values and clicked Finalize without pressing each save icon,
        // these arrays keep Scores page, Audit History, and Standings in sync.
        if (meta != null) {
            if (meta.getPlayer1BoardScores() != null) {
                match.setPlayer1BoardScores(new ArrayList<>(meta.getPlayer1BoardScores()));
            }
            if (meta.getPlayer2BoardScores() != null) {
                match.setPlayer2BoardScores(new ArrayList<>(meta.getPlayer2BoardScores()));
            }
        }

        ensureBoardArrays(match);
        normalizeEnteredBoardPairs(match);
        trimAfterLastPlayedBoard(match);
        calculateTotals(match);

        match.setScoreFinalized(true);
        match.setStatus("COMPLETED");

        int p1 = match.getPlayer1Score() == null ? 0 : match.getPlayer1Score();
        int p2 = match.getPlayer2Score() == null ? 0 : match.getPlayer2Score();
        if (p1 > p2) match.setWinnerId(match.getPlayer1Id());
        else if (p2 > p1) match.setWinnerId(match.getPlayer2Id());
        else match.setWinnerId(null);

        Match saved = matchRepository.save(match);
        scoreAuditService.record(saved, phone, "PLAYER", httpRequest, metaWithAction(meta, "FINALIZE"));
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


    private ScoreAuditMetaRequest toMeta(BoardScoreRequest request, String actionType) {
        if (request == null) return null;
        ScoreAuditMetaRequest meta = new ScoreAuditMetaRequest();
        meta.setPhone(request.getPhone());
        meta.setLatitude(request.getLatitude());
        meta.setLongitude(request.getLongitude());
        meta.setGeoLocation(request.getGeoLocation());
        meta.setActionType(actionType);
        return meta;
    }

    private ScoreAuditMetaRequest metaWithAction(ScoreAuditMetaRequest meta, String actionType) {
        ScoreAuditMetaRequest result = meta == null ? new ScoreAuditMetaRequest() : meta;
        result.setActionType(actionType);
        return result;
    }

    private void validatePhoneAccess(Match match, String phone, boolean allowFinalized) {
        if (!phoneMatches(match, normalizePhone(phone))) {
            throw new IllegalStateException("This phone number is not allowed to update this score card.");
        }
        if (!allowFinalized && Boolean.TRUE.equals(match.getScoreFinalized())) {
            throw new IllegalStateException("This score card is finalized. Please contact admin for edits.");
        }
    }

    private boolean phoneMatches(Match m, String normalizedPhone) {
        if (normalizedPhone == null || normalizedPhone.isBlank()) return false;
        if (containsPhone(m.getPlayer1Phones(), normalizedPhone) || containsPhone(m.getPlayer2Phones(), normalizedPhone)) {
            return true;
        }

        // Knockout matches may be generated from standings without phone lists.
        // Fallback to attended tournament registrations by displayed team name.
        List<Registration> registrations = registrationRepository.findByTournamentIdAndFormatAndAttendedTrue(m.getTournamentId(), m.getFormat());
        return registrations.stream()
                .filter(r -> displayName(r).equalsIgnoreCase(nullSafe(m.getPlayer1Name()))
                        || displayName(r).equalsIgnoreCase(nullSafe(m.getPlayer2Name())))
                .map(Registration::getPhone)
                .filter(Objects::nonNull)
                .map(this::normalizePhone)
                .anyMatch(normalizedPhone::equals);
    }

    private boolean containsPhone(List<String> values, String normalizedPhone) {
        if (values == null) return false;
        return values.stream()
                .filter(Objects::nonNull)
                .map(this::normalizePhone)
                .anyMatch(normalizedPhone::equals);
    }

    private String displayName(Registration registration) {
        if (registration == null) return "";
        if (("Doubles".equalsIgnoreCase(registration.getFormat()) || "Mixed Doubles".equalsIgnoreCase(registration.getFormat()))
                && registration.getPartnerName() != null && !registration.getPartnerName().isBlank()) {
            return nullSafe(registration.getPlayerName()) + " / " + nullSafe(registration.getPartnerName());
        }
        return nullSafe(registration.getPlayerName());
    }

    private String nullSafe(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalizePhone(String value) {
        if (value == null) return "";
        return value.replaceAll("[^0-9]", "");
    }

    private void ensureBoardArrays(Match match) {
        if (match.getPlayer1BoardScores() == null) match.setPlayer1BoardScores(new ArrayList<>());
        if (match.getPlayer2BoardScores() == null) match.setPlayer2BoardScores(new ArrayList<>());
        while (match.getPlayer1BoardScores().size() < 8) match.getPlayer1BoardScores().add(null);
        while (match.getPlayer2BoardScores().size() < 8) match.getPlayer2BoardScores().add(null);
    }

    private void normalizeEnteredBoardPairs(Match match) {
        int max = Math.min(match.getPlayer1BoardScores().size(), match.getPlayer2BoardScores().size());
        for (int i = 0; i < max; i++) {
            Integer p1 = match.getPlayer1BoardScores().get(i);
            Integer p2 = match.getPlayer2BoardScores().get(i);
            if (p1 != null && p2 == null) match.getPlayer2BoardScores().set(i, 0);
            if (p2 != null && p1 == null) match.getPlayer1BoardScores().set(i, 0);
        }
    }

    private void trimAfterLastPlayedBoard(Match match) {
        int last = -1;
        int max = Math.min(match.getPlayer1BoardScores().size(), match.getPlayer2BoardScores().size());
        for (int i = 0; i < max; i++) {
            Integer p1 = match.getPlayer1BoardScores().get(i);
            Integer p2 = match.getPlayer2BoardScores().get(i);
            if ((p1 != null && p1 != 0) || (p2 != null && p2 != 0)) last = i;
        }
        if (last < 0) last = 0;
        match.setPlayer1BoardScores(new ArrayList<>(match.getPlayer1BoardScores().subList(0, last + 1)));
        match.setPlayer2BoardScores(new ArrayList<>(match.getPlayer2BoardScores().subList(0, last + 1)));
        for (int i = 0; i < match.getPlayer1BoardScores().size(); i++) {
            if (match.getPlayer1BoardScores().get(i) == null) match.getPlayer1BoardScores().set(i, 0);
            if (match.getPlayer2BoardScores().get(i) == null) match.getPlayer2BoardScores().set(i, 0);
        }
    }

    private void calculateTotals(Match match) {
        // Step 29.1: cap match totals at 25 for standings/display while keeping board scores intact.
        match.setPlayer1Score(Math.min(25, sum(match.getPlayer1BoardScores())));
        match.setPlayer2Score(Math.min(25, sum(match.getPlayer2BoardScores())));
    }

    private int sum(List<Integer> values) {
        if (values == null) return 0;
        return values.stream().filter(Objects::nonNull).mapToInt(Integer::intValue).sum();
    }

    private List<String> allowedPlayers(Match m) {
        List<String> allowed = new ArrayList<>();
        allowed.add(m.getPlayer1Name());
        allowed.add(m.getPlayer2Name());
        return allowed.stream().filter(Objects::nonNull).toList();
    }

    private String roundLabel(Match m) {
        String type = m.getRoundType() == null ? "SRR" : m.getRoundType();
        if ("SRR".equalsIgnoreCase(type)) return "SRR Round " + m.getRoundNumber();
        return type.replace("_", " ");
    }

    private int roundSortValue(Match m) {
        String type = m.getRoundType() == null ? "SRR" : m.getRoundType().toUpperCase();
        return switch (type) {
            case "PRE_QUARTERS" -> 200;
            case "QUARTERS" -> 300;
            case "SEMIFINALS" -> 400;
            case "FINALS" -> 500;
            default -> 100 + m.getRoundNumber();
        };
    }

    private int safeBoardNumber(String boardNumber) {
        if (boardNumber == null) return 0;
        try { return Integer.parseInt(boardNumber.replaceAll("[^0-9]", "")); }
        catch (Exception ex) { return 0; }
    }
}
