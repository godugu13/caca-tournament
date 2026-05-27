package com.caca.tournament.service;

import com.caca.tournament.model.Match;
import com.caca.tournament.model.Registration;
import com.caca.tournament.model.Standing;
import com.caca.tournament.model.Tournament;
import com.caca.tournament.repository.MatchRepository;
import com.caca.tournament.repository.RegistrationRepository;
import com.caca.tournament.repository.TournamentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SrrService {
    private final RegistrationRepository registrationRepository;
    private final MatchRepository matchRepository;
    private final TournamentRepository tournamentRepository;

    public List<Match> generateSrrRound(String tournamentId, String format, int roundNumber, String venueName) {
        if (tournamentId == null || tournamentId.isBlank()) {
            throw new IllegalStateException("Please select a valid tournament before generating matchups.");
        }
        Tournament tournament = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new IllegalStateException("Selected tournament was not found. Please refresh Game Day page and select the tournament again."));
        int maxRounds = tournament.getSrrRounds();
        if (roundNumber < 1 || roundNumber > maxRounds) {
            throw new IllegalStateException("Round must be between 1 and " + maxRounds);
        }

        List<Match> existingMatches = matchRepository.findByTournamentIdAndFormatOrderByRoundNumberAscBoardNumberAsc(tournamentId, format)
                .stream()
                .filter(m -> "SRR".equalsIgnoreCase(m.getRoundType()))
                .toList();

        boolean roundAlreadyGenerated = existingMatches.stream().anyMatch(m -> m.getRoundNumber() == roundNumber);
        if (roundAlreadyGenerated) {
            throw new IllegalStateException("SRR Round #" + roundNumber + " is already generated for " + format);
        }

        int lastGeneratedRound = existingMatches.stream().mapToInt(Match::getRoundNumber).max().orElse(0);
        if (roundNumber != lastGeneratedRound + 1) {
            throw new IllegalStateException("Generate SRR rounds in sequence. Next available round is #" + (lastGeneratedRound + 1));
        }

        if (roundNumber > 1 && !isRoundCompleted(existingMatches, roundNumber - 1)) {
            throw new IllegalStateException("Complete all scores for SRR Round #" + (roundNumber - 1) + " before generating SRR Round #" + roundNumber);
        }

        List<Registration> registrations = registrationRepository.findByTournamentIdAndFormatAndAttendedTrue(tournamentId, format);
        List<Registration> players = uniquePlayingUnits(registrations, format);
        if (players.size() < 2) {
            throw new IllegalStateException("Select attendance for at least 2 players/teams before generating SRR Round #1");
        }

        List<Standing> standings = calculateStandings(tournamentId, format);
        Map<String, Integer> rankMap = standings.stream().collect(Collectors.toMap(Standing::getPlayerId, Standing::getRank));

        players.sort(Comparator.comparingInt((Registration p) -> rankMap.getOrDefault(playingUnitId(p, format), Integer.MAX_VALUE))
                .thenComparing(this::displayName));

        Set<String> alreadyPlayed = existingPairs(tournamentId, format);
        List<Match> result = new ArrayList<>();
        Set<String> used = new HashSet<>();
        int board = 1;

        for (Registration p1 : players) {
            String p1UnitId = playingUnitId(p1, format);
            if (used.contains(p1UnitId)) continue;
            Registration chosen = null;
            for (Registration p2 : players) {
                String p2UnitId = playingUnitId(p2, format);
                if (p1UnitId.equals(p2UnitId) || used.contains(p2UnitId)) continue;
                String pairKey = pairKey(p1UnitId, p2UnitId);
                if (!alreadyPlayed.contains(pairKey)) {
                    chosen = p2;
                    break;
                }
            }

            if (chosen != null) {
                String chosenUnitId = playingUnitId(chosen, format);
                Match match = new Match();
                match.setTournamentId(tournamentId);
                match.setFormat(format);
                match.setRoundType("SRR");
                match.setRoundNumber(roundNumber);
                match.setVenueName("Board");
                match.setBoardNumber(String.valueOf(board++));
                match.setPlayer1Id(p1UnitId);
                match.setPlayer1Name(displayName(p1));
                match.setPlayer1Emails(emailsForUnit(registrations, p1, format));
                match.setPlayer1Phones(phonesForUnit(registrations, p1, format));
                match.setPlayer2Id(chosenUnitId);
                match.setPlayer2Name(displayName(chosen));
                match.setPlayer2Emails(emailsForUnit(registrations, chosen, format));
                match.setPlayer2Phones(phonesForUnit(registrations, chosen, format));
                match.setPlayer1Rank(rankMap.getOrDefault(p1UnitId, 0));
                match.setPlayer2Rank(rankMap.getOrDefault(chosenUnitId, 0));
                result.add(match);
                used.add(p1UnitId);
                used.add(chosenUnitId);
            }
        }

        players.stream()
                .filter(p -> !used.contains(playingUnitId(p, format)))
                .findFirst()
                .ifPresent(bye -> {
                    String byeUnitId = playingUnitId(bye, format);
                    Match byeMatch = new Match();
                    byeMatch.setTournamentId(tournamentId);
                    byeMatch.setFormat(format);
                    byeMatch.setRoundType("SRR");
                    byeMatch.setRoundNumber(roundNumber);
                    byeMatch.setVenueName("BYE");
                    byeMatch.setBoardNumber("BYE");
                    byeMatch.setPlayer1Id(byeUnitId);
                    byeMatch.setPlayer1Name(displayName(bye));
                    byeMatch.setPlayer1Emails(emailsForUnit(registrations, bye, format));
                    byeMatch.setPlayer1Phones(phonesForUnit(registrations, bye, format));
                    byeMatch.setPlayer1Rank(rankMap.getOrDefault(byeUnitId, 0));
                    byeMatch.setPlayer2Id("BYE");
                    byeMatch.setPlayer2Name("BYE");
                    byeMatch.setStatus("BYE");
                    result.add(byeMatch);
                });

        long playableMatchCount = result.stream().filter(m -> !"BYE".equalsIgnoreCase(m.getStatus())).count();
        if (playableMatchCount == 0) {
            throw new IllegalStateException("No unique SRR matchups remaining. Reduce SRR rounds or allow rematches manually.");
        }
        return matchRepository.saveAll(result);
    }


    public List<Match> generateKnockoutRound(String tournamentId, String format, String stage) {
        return generateKnockoutRound(tournamentId, format, stage, "");
    }

    public List<Match> generateKnockoutRound(String tournamentId, String format, String requestedStage, String group) {
        String stage = normalizeStage(requestedStage);
        List<Match> allMatches = matchRepository.findByTournamentIdAndFormatOrderByRoundNumberAscBoardNumberAsc(tournamentId, format);
        boolean stageAlreadyGenerated = allMatches.stream().anyMatch(m -> stage.equalsIgnoreCase(m.getRoundType()));
        if (stageAlreadyGenerated) {
            throw new IllegalStateException(stageLabel(stage) + " is already generated for " + format);
        }

        List<Match> result = new ArrayList<>();
        if ("QUARTERS".equals(stage)) {
            List<Standing> standings = calculateStandings(tournamentId, format);
            if (standings.size() >= 32) {
                String[] groups = {"Champions", "Challengers", "Enthusiasts", "Rising Stars"};
                int board = 1;
                for (int groupIndex = 0; groupIndex < groups.length; groupIndex++) {
                    String groupName = groups[groupIndex];
                    int from = groupIndex * 8;
                    int to = Math.min(from + 8, standings.size());
                    if (to - from < 8) break;
                    List<Participant> groupParticipants = standings.subList(from, to).stream()
                            .map(s -> new Participant(s.getPlayerId(), s.getPlayerName(), s.getRank(), groupName))
                            .toList();
                    result.addAll(createSeededMatches(tournamentId, format, stage, groupName, groupParticipants, board));
                    board += 4;
                }
                return matchRepository.saveAll(result);
            }
        }

        List<Participant> participants = participantsForKnockout(tournamentId, format, stage, allMatches);
        int minimum = minimumCount(stage);
        if (participants.size() < minimum) {
            throw new IllegalStateException(stageLabel(stage) + " needs at least " + minimum + " players/teams. Current active count is " + participants.size());
        }
        boolean groupedKnockout = participants.stream().map(p -> normalizedGroup(p.group())).distinct().count() > 1;
        int expected = expectedCount(stage);
        if (!groupedKnockout && participants.size() > expected) {
            participants = participants.subList(0, expected);
        }
        if (!groupedKnockout
                && ("PRE_QUARTERS".equals(stage) || "QUARTERS".equals(stage) || "SEMIFINALS".equals(stage) || "FINALS".equals(stage))
                && participants.size() > minimum) {
            participants = participants.subList(0, minimum);
        }

        Map<String, List<Participant>> participantsByGroup = participants.stream()
                .collect(Collectors.groupingBy(p -> normalizedGroup(p.group()), LinkedHashMap::new, Collectors.toList()));
        int board = 1;
        for (Map.Entry<String, List<Participant>> entry : participantsByGroup.entrySet()) {
            List<Participant> groupParticipants = entry.getValue();
            if (("SEMIFINALS".equals(stage) && groupParticipants.size() == 4) ||
                    ("FINALS".equals(stage) && groupParticipants.size() == 2) ||
                    ("QUARTERS".equals(stage) && groupParticipants.size() == 8) ||
                    ("PRE_QUARTERS".equals(stage) && groupParticipants.size() == 16)) {
                result.addAll(createSeededMatches(tournamentId, format, stage, entry.getKey(), groupParticipants, board));
                board += Math.max(1, groupParticipants.size() / 2);
            }
        }
        if (result.isEmpty()) {
            result.addAll(createSeededMatches(tournamentId, format, stage, "Main", participants, 1));
        }
        return matchRepository.saveAll(result);
    }

    private List<Match> createSeededMatches(String tournamentId, String format, String stage, String groupName, List<Participant> participants, int startingBoard) {
        List<int[]> pairings = "SEMIFINALS".equals(stage) && participants.size() == 4
                ? List.of(new int[]{0, 1}, new int[]{2, 3})
                : seedPairings(participants.size());
        List<Match> result = new ArrayList<>();
        int board = startingBoard;
        for (int[] pairing : pairings) {
            Participant p1 = participants.get(pairing[0]);
            Participant p2 = participants.get(pairing[1]);
            Match match = new Match();
            match.setTournamentId(tournamentId);
            match.setFormat(format);
            match.setRoundType(stage);
            match.setRoundGroup(groupName);
            match.setRoundNumber(knockoutRoundNumber(stage));
            match.setVenueName("Board");
            match.setBoardNumber(String.valueOf(board++));
            match.setPlayer1Id(p1.id());
            match.setPlayer1Name(p1.name());
            match.setPlayer1Rank(p1.rank());
            match.setPlayer2Id(p2.id());
            match.setPlayer2Name(p2.name());
            match.setPlayer2Rank(p2.rank());
            result.add(match);
        }
        return result;
    }

    private List<Participant> participantsForKnockout(String tournamentId, String format, String stage, List<Match> allMatches) {
        if ("SEMIFINALS".equals(stage) && knockoutRoundCompleted(allMatches, "QUARTERS")) {
            return winnersFromPriorStageByGroup(allMatches, "QUARTERS", "SEMIFINALS");
        }
        if ("FINALS".equals(stage) && knockoutRoundCompleted(allMatches, "SEMIFINALS")) {
            return winnersFromPriorStageByGroup(allMatches, "SEMIFINALS", "FINALS");
        }
        if ("QUARTERS".equals(stage) && knockoutRoundCompleted(allMatches, "PRE_QUARTERS")) {
            return matchesForStage(allMatches, "PRE_QUARTERS").stream()
                    .map(this::winnerParticipant)
                    .filter(Objects::nonNull)
                    .limit(8)
                    .toList();
        }

        int count = expectedCount(stage);
        return calculateStandings(tournamentId, format).stream()
                .limit(count)
                .map(s -> new Participant(s.getPlayerId(), s.getPlayerName(), s.getRank(), "Main"))
                .toList();
    }

    private List<Participant> winnersFromPriorStageByGroup(List<Match> allMatches, String priorStage, String nextStage) {
        Map<String, List<Match>> byGroup = matchesForStage(allMatches, priorStage).stream()
                .collect(Collectors.groupingBy(m -> normalizedGroup(m.getRoundGroup()), LinkedHashMap::new, Collectors.toList()));
        List<Participant> result = new ArrayList<>();
        for (Map.Entry<String, List<Match>> entry : byGroup.entrySet()) {
            List<Match> matches = entry.getValue().stream()
                    .sorted(Comparator.comparingInt(m -> parseBoardNumber(m.getBoardNumber())))
                    .toList();
            if ("SEMIFINALS".equals(nextStage) && matches.size() >= 4) {
                Match q18 = matches.get(0);
                Match q27 = matches.get(1);
                Match q36 = matches.get(2);
                Match q45 = matches.get(3);
                result.add(winnerParticipantWithGroup(q18, entry.getKey()));
                result.add(winnerParticipantWithGroup(q27, entry.getKey()));
                result.add(winnerParticipantWithGroup(q36, entry.getKey()));
                result.add(winnerParticipantWithGroup(q45, entry.getKey()));
            } else if ("FINALS".equals(nextStage)) {
                matches.stream()
                        .map(m -> winnerParticipantWithGroup(m, entry.getKey()))
                        .filter(Objects::nonNull)
                        .limit(2)
                        .forEach(result::add);
            }
        }
        return result.stream().filter(Objects::nonNull).toList();
    }

    private String normalizedGroup(String group) {
        return group == null || group.isBlank() ? "Main" : group;
    }

    private List<int[]> seedPairings(int size) {
        List<int[]> pairings = new ArrayList<>();
        for (int i = 0; i < size / 2; i++) {
            pairings.add(new int[]{i, size - 1 - i});
        }
        return pairings;
    }

    private boolean knockoutRoundCompleted(List<Match> allMatches, String stage) {
        List<Match> matches = matchesForStage(allMatches, stage);
        return !matches.isEmpty() && matches.stream().allMatch(m -> Boolean.TRUE.equals(m.getScoreFinalized()) && m.getWinnerId() != null && !m.getWinnerId().isBlank());
    }

    private List<Match> matchesForStage(List<Match> allMatches, String stage) {
        return allMatches.stream()
                .filter(m -> stage.equalsIgnoreCase(m.getRoundType()))
                .sorted(Comparator.comparing((Match m) -> normalizedGroup(m.getRoundGroup()))
                        .thenComparingInt(m -> parseBoardNumber(m.getBoardNumber())))
                .toList();
    }

    private int parseBoardNumber(String boardNumber) {
        try { return Integer.parseInt(boardNumber); } catch (Exception ex) { return 999; }
    }

    private Participant winnerParticipant(Match match) {
        return winnerParticipantWithGroup(match, normalizedGroup(match == null ? null : match.getRoundGroup()));
    }

    private Participant winnerParticipantWithGroup(Match match, String group) {
        if (match == null || match.getWinnerId() == null) return null;
        if (match.getWinnerId().equals(match.getPlayer1Id())) return new Participant(match.getPlayer1Id(), match.getPlayer1Name(), match.getPlayer1Rank() == null ? 0 : match.getPlayer1Rank(), group);
        if (match.getWinnerId().equals(match.getPlayer2Id())) return new Participant(match.getPlayer2Id(), match.getPlayer2Name(), match.getPlayer2Rank() == null ? 0 : match.getPlayer2Rank(), group);
        return null;
    }

    private String normalizeStage(String requestedStage) {
        String stage = requestedStage == null ? "" : requestedStage.trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        return switch (stage) {
            case "PRE_QUARTERS", "PREQUARTERS", "PRE_QUARTER" -> "PRE_QUARTERS";
            case "QUARTERS", "QUARTER", "QUARTER_FINALS" -> "QUARTERS";
            case "SEMIFINALS", "SEMI_FINALS", "SEMIS", "SEMI" -> "SEMIFINALS";
            case "FINALS", "FINAL" -> "FINALS";
            default -> throw new IllegalStateException("Unknown knockout stage: " + requestedStage);
        };
    }

    private int expectedCount(String stage) {
        return switch (stage) {
            case "PRE_QUARTERS" -> 16;
            case "QUARTERS" -> 8;
            case "SEMIFINALS" -> 4;
            case "FINALS" -> 2;
            default -> 0;
        };
    }

    private int minimumCount(String stage) {
        return switch (stage) {
            case "PRE_QUARTERS" -> 16;
            case "QUARTERS" -> 8;
            case "SEMIFINALS" -> 4;
            case "FINALS" -> 2;
            default -> 2;
        };
    }

    private int knockoutRoundNumber(String stage) {
        return switch (stage) {
            case "PRE_QUARTERS" -> 1;
            case "QUARTERS" -> 2;
            case "SEMIFINALS" -> 3;
            case "FINALS" -> 4;
            default -> 0;
        };
    }

    private String stageLabel(String stage) {
        return switch (stage) {
            case "PRE_QUARTERS" -> "Pre-Quarters";
            case "QUARTERS" -> "Quarters";
            case "SEMIFINALS" -> "Semifinals";
            case "FINALS" -> "Finals";
            default -> stage;
        };
    }

    private record Participant(String id, String name, int rank, String group) {}


    private List<Standing> rankedDivision(List<Standing> standings, String group) {
        String g = group == null ? "" : group.trim();
        if (standings.size() < 32 || g.isBlank() || "Overall".equalsIgnoreCase(g)) {
            return standings;
        }

        int start;
        int end;
        if ("Champions".equalsIgnoreCase(g)) {
            start = 0; end = 8;
        } else if ("Challengers".equalsIgnoreCase(g) || "Challenges".equalsIgnoreCase(g)) {
            start = 8; end = 16;
        } else if ("Enthusiasts".equalsIgnoreCase(g)) {
            start = 16; end = 24;
        } else if ("Aspirants".equalsIgnoreCase(g)) {
            start = 24; end = 32;
        } else {
            return standings;
        }

        if (standings.size() <= start) return List.of();
        return standings.subList(start, Math.min(end, standings.size()));
    }

    private String normalizeKnockoutGroup(String group, List<Standing> standings) {
        if (standings.size() < 32) return "Overall";
        if (group == null || group.isBlank()) return "Champions";
        if ("Challenges".equalsIgnoreCase(group)) return "Challengers";
        return group;
    }

    public List<Standing> calculateStandings(String tournamentId, String format) {
        // Standings must include only players/teams marked present in Game Day attendance.
        // Registered-but-absent players are not part of the active tournament field.
        List<Registration> players = uniquePlayingUnits(
                registrationRepository.findByTournamentIdAndFormatAndAttendedTrue(tournamentId, format),
                format
        );

        Map<String, Standing> map = new LinkedHashMap<>();
        Map<String, Standing> aliasMap = new HashMap<>();

        for (Registration p : players) {
            String unitId = playingUnitId(p, format);
            Standing standing = new Standing(unitId, displayName(p), 0, 0, 0, 0, 0);
            map.put(unitId, standing);

            // Step 28.2B:
            // Support both the new tournament-specific pair id and older match ids already
            // present in Mongo from previous steps. This prevents all standings from showing
            // 0/0/0/0 after a code upgrade.
            registerStandingAlias(aliasMap, unitId, standing);
            registerStandingAlias(aliasMap, oldPairUnitId(p, format), standing);
            registerStandingAlias(aliasMap, displayName(p), standing);
        }

        List<Match> matches = matchRepository.findByTournamentIdAndFormatOrderByRoundNumberAscBoardNumberAsc(tournamentId, format);
        for (Match m : matches) {
            // Standings/ranking seed is based on finalized SRR results only.
            // Knockout matches should not change the SRR ranking table.
            if (!"SRR".equalsIgnoreCase(m.getRoundType())) continue;
            if (!Boolean.TRUE.equals(m.getScoreFinalized())) continue;

            int p1Score = Math.min(25, m.getPlayer1Score() == null ? sumScores(m.getPlayer1BoardScores()) : m.getPlayer1Score());
            int p2Score = Math.min(25, m.getPlayer2Score() == null ? sumScores(m.getPlayer2BoardScores()) : m.getPlayer2Score());

            Standing s1 = standingForMatchSide(aliasMap, m.getPlayer1Id(), m.getPlayer1Name());
            if (s1 == null) continue;

            if ("BYE".equalsIgnoreCase(m.getStatus())) {
                s1.setPointsFor(s1.getPointsFor() + p1Score);
                s1.setWins(s1.getWins() + 1);
                continue;
            }

            Standing s2 = standingForMatchSide(aliasMap, m.getPlayer2Id(), m.getPlayer2Name());
            if (s2 == null) continue;

            s1.setPointsFor(s1.getPointsFor() + p1Score);
            s1.setPointsAgainst(s1.getPointsAgainst() + p2Score);
            s2.setPointsFor(s2.getPointsFor() + p2Score);
            s2.setPointsAgainst(s2.getPointsAgainst() + p1Score);

            if (p1Score > p2Score) s1.setWins(s1.getWins() + 1);
            if (p2Score > p1Score) s2.setWins(s2.getWins() + 1);
        }

        List<Standing> standings = new ArrayList<>(map.values());
        standings.forEach(s -> s.setPointsDifferential(s.getPointsFor() - s.getPointsAgainst()));
        standings.sort(Comparator.comparingInt(Standing::getWins).reversed()
                .thenComparing(Comparator.comparingInt(Standing::getPointsDifferential).reversed())
                .thenComparing(Standing::getPlayerName));
        for (int i = 0; i < standings.size(); i++) standings.get(i).setRank(i + 1);
        return standings;
    }

    private void registerStandingAlias(Map<String, Standing> aliasMap, String key, Standing standing) {
        String normalized = normalizeStandingAlias(key);
        if (!normalized.isBlank()) {
            aliasMap.putIfAbsent(normalized, standing);
        }
    }

    private Standing standingForMatchSide(Map<String, Standing> aliasMap, String playerId, String playerName) {
        Standing byId = aliasMap.get(normalizeStandingAlias(playerId));
        if (byId != null) return byId;
        return aliasMap.get(normalizeStandingAlias(playerName));
    }

    private String normalizeStandingAlias(String value) {
        if (value == null) return "";
        return value.trim()
                .toLowerCase(Locale.ROOT)
                .replaceAll("\\s*/\\s*", "__")
                .replaceAll("\\s+", "")
                .replaceAll("[^a-z0-9_]", "");
    }

    private String oldPairUnitId(Registration registration, String format) {
        if (isPairFormat(format)
                && registration.getPartnerName() != null && !registration.getPartnerName().isBlank()) {
            List<String> names = new ArrayList<>();
            names.add(normalizeName(registration.getPlayerName()).replaceAll("[^a-z0-9]", ""));
            names.add(normalizeName(registration.getPartnerName()).replaceAll("[^a-z0-9]", ""));
            Collections.sort(names);
            return String.join("__", names);
        }
        return registration.getId();
    }

    private int sumScores(List<Integer> scores) {
        if (scores == null) return 0;
        return scores.stream().filter(Objects::nonNull).mapToInt(Integer::intValue).sum();
    }

    private boolean isRoundCompleted(List<Match> matches, int roundNumber) {
        List<Match> roundMatches = matches.stream().filter(m -> m.getRoundNumber() == roundNumber).toList();
        return !roundMatches.isEmpty() && roundMatches.stream().allMatch(m ->
                ("BYE".equalsIgnoreCase(m.getStatus()) && Boolean.TRUE.equals(m.getScoreFinalized()) && m.getPlayer1Score() != null) ||
                        ("COMPLETED".equalsIgnoreCase(m.getStatus()) && m.getPlayer1Score() != null && m.getPlayer2Score() != null));
    }

    private Set<String> existingPairs(String tournamentId, String format) {
        return matchRepository.findByTournamentIdAndFormatOrderByRoundNumberAscBoardNumberAsc(tournamentId, format)
                .stream()
                .filter(m -> "SRR".equalsIgnoreCase(m.getRoundType()))
                .filter(m -> !"BYE".equalsIgnoreCase(m.getStatus()))
                .map(m -> pairKey(m.getPlayer1Id(), m.getPlayer2Id()))
                .collect(Collectors.toSet());
    }

    private List<Registration> uniquePlayingUnits(List<Registration> registrations, String format) {
        if (!isPairFormat(format)) {
            return registrations;
        }

        // Step 28.2:
        // Doubles/Mixed Doubles team pairings are tournament-specific.
        // Raju/Rashmi in one tournament should not become a permanent global pair.
        // Also Raju/Rashmi and Rashmi/Raju must be treated as the same team
        // inside the selected tournament + format.
        Map<String, Registration> unique = new LinkedHashMap<>();
        for (Registration registration : registrations) {
            if (registration.getPartnerName() == null || registration.getPartnerName().isBlank()) {
                // Keep incomplete pair records out of game-day pair generation.
                // Admin can correct/delete the registration from Players View.
                continue;
            }
            unique.putIfAbsent(playingUnitId(registration, format), registration);
        }
        return new ArrayList<>(unique.values());
    }

    private String playingUnitId(Registration registration, String format) {
        if (isPairFormat(format)
                && registration.getPartnerName() != null && !registration.getPartnerName().isBlank()) {
            List<String> names = new ArrayList<>();
            names.add(normalizeTeamNameToken(registration.getPlayerName()));
            names.add(normalizeTeamNameToken(registration.getPartnerName()));
            Collections.sort(names);
            return normalizeTeamNameToken(registration.getTournamentId()) + "__" +
                    normalizeTeamNameToken(format) + "__" +
                    String.join("__", names);
        }
        return registration.getId();
    }

    private boolean isPairFormat(String format) {
        return "Doubles".equalsIgnoreCase(format) || "Mixed Doubles".equalsIgnoreCase(format);
    }

    private List<String> emailsForUnit(List<Registration> registrations, Registration unit, String format) {
        return contactValuesForUnit(registrations, unit, format, true);
    }

    private List<String> phonesForUnit(List<Registration> registrations, Registration unit, String format) {
        return contactValuesForUnit(registrations, unit, format, false);
    }

    private List<String> contactValuesForUnit(List<Registration> registrations, Registration unit, String format, boolean email) {
        String unitId = playingUnitId(unit, format);
        return registrations.stream()
                .filter(r -> unitId.equals(playingUnitId(r, format)))
                .map(r -> email ? r.getEmail() : r.getPhone())
                .filter(v -> v != null && !v.isBlank())
                .map(v -> v.trim().toLowerCase(Locale.ROOT))
                .distinct()
                .collect(Collectors.toList());
    }

    private String normalizeName(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    private String normalizeTeamNameToken(String value) {
        if (value == null) return "";
        return value.trim()
                .replaceAll("\\s+", " ")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]", "");
    }

    private String pairKey(String a, String b) {
        return a.compareTo(b) < 0 ? a + "_" + b : b + "_" + a;
    }

    private String displayName(Registration registration) {
        if (isPairFormat(registration.getFormat())
                && registration.getPartnerName() != null && !registration.getPartnerName().isBlank()) {
            return registration.getPlayerName() + " / " + registration.getPartnerName();
        }
        return registration.getPlayerName();
    }
}
