package com.caca.tournament.controller;

import com.caca.tournament.model.Tournament;

import com.caca.tournament.model.Registration;
import com.caca.tournament.repository.RegistrationRepository;
import com.caca.tournament.repository.TournamentRepository;
import com.caca.tournament.service.MemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;

@RestController
@RequestMapping("/api/registrations")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class RegistrationController {
    private final RegistrationRepository repository;
    private final MemberService memberService;
    private final TournamentRepository tournamentRepository;

    private static final String CURRENT_REGISTRATION_ALIAS = "TEMP_CACA_9TH_ROLLING_TROPHY_2026";
    private static final String CURRENT_TOURNAMENT_NAME = "CACA 9th Rolling Trophy - October 24, 2026";
    private static final LocalDate CURRENT_TOURNAMENT_DATE = LocalDate.of(2026, 10, 24);
    private volatile String currentTournamentIdCache;

    @GetMapping("/tournament/{tournamentId}")
    public List<Registration> byTournament(@PathVariable String tournamentId) {
        return normalizeList(repository.findByTournamentIdAndRecordStatusNot(tournamentId, "D"));
    }


    @GetMapping("/tournament/{tournamentId}/public-names")
    public List<Map<String, String>> publicNames(@PathVariable String tournamentId) {
        return repository.findByTournamentIdAndRecordStatusNot(tournamentId, "D").stream()
                .map(this::normalizeCsvMappedRegistration)
                .map(r -> Map.of(
                        "playerName", safe(r.getPlayerName()),
                        "format", safe(r.getFormat()),
                        "partnerName", safe(r.getPartnerName())
                ))
                .toList();
    }

    /**
     * Unified current Rolling Trophy registrations.
     * During recovery this returns both the real tournament registrations and any
     * temporary-alias registrations, so no player disappears from the UI.
     */
    @GetMapping("/current")
    public List<Registration> currentRegistrations() {
        String realId = resolveCurrentTournament().getId();
        List<Registration> combined = new ArrayList<>(
                repository.findByTournamentIdAndRecordStatusNot(realId, "D")
        );
        combined.addAll(repository.findByTournamentIdAndRecordStatusNot(CURRENT_REGISTRATION_ALIAS, "D"));
        return normalizeList(deduplicateById(combined));
    }

    @GetMapping("/current/public-names")
    public List<Map<String, String>> currentPublicNames() {
        return currentRegistrations().stream()
                .map(r -> Map.of(
                        "playerName", safe(r.getPlayerName()),
                        "format", safe(r.getFormat()),
                        "partnerName", safe(r.getPartnerName())
                ))
                .distinct()
                .toList();
    }

    @GetMapping("/recovery/current/preview")
    public ResponseEntity<?> currentRecoveryPreview(@RequestParam(defaultValue = "") String pin) {
        if (!isSuperAdminPin(pin)) {
            return ResponseEntity.status(403).body(Map.of("message", "Super Admin PIN is required"));
        }
        Tournament tournament = resolveCurrentTournament();
        long aliasTotal = repository.findByTournamentId(CURRENT_REGISTRATION_ALIAS).size();
        long aliasActive = repository.findByTournamentIdAndRecordStatusNot(CURRENT_REGISTRATION_ALIAS, "D").size();
        long realActive = repository.findByTournamentIdAndRecordStatusNot(tournament.getId(), "D").size();
        return ResponseEntity.ok(Map.of(
                "tournamentId", tournament.getId(),
                "tournamentName", tournament.getName(),
                "realActiveRegistrations", realActive,
                "temporaryActiveRegistrations", aliasActive,
                "temporaryTotalRegistrations", aliasTotal
        ));
    }

    @PostMapping("/recovery/current")
    public ResponseEntity<?> recoverCurrentRegistrations(@RequestParam(defaultValue = "") String pin) {
        if (!isSuperAdminPin(pin)) {
            return ResponseEntity.status(403).body(Map.of("message", "Super Admin PIN is required"));
        }

        Tournament tournament = resolveCurrentTournament();
        List<Registration> temporary = repository.findByTournamentId(CURRENT_REGISTRATION_ALIAS);
        for (Registration registration : temporary) {
            registration.setTournamentId(tournament.getId());
            if (registration.getFormat() == null || registration.getFormat().isBlank()) {
                registration.setFormat("Doubles");
            }
        }
        if (!temporary.isEmpty()) {
            repository.saveAll(temporary);
        }

        long activeAfter = repository.findByTournamentIdAndRecordStatusNot(tournament.getId(), "D").size();
        return ResponseEntity.ok(Map.of(
                "recovered", temporary.size(),
                "tournamentId", tournament.getId(),
                "tournamentName", tournament.getName(),
                "activeRegistrationsAfterRecovery", activeAfter
        ));
    }

    @GetMapping("/tournament/{tournamentId}/{format}")
    public List<Registration> byTournamentAndFormat(@PathVariable String tournamentId, @PathVariable String format) {
        return normalizeList(repository.findByTournamentIdAndFormatAndRecordStatusNot(tournamentId, format, "D"));
    }

    @PostMapping
    public Registration register(@Valid @RequestBody Registration registration) {
        registration = normalizeCsvMappedRegistration(registration);

        // Temporary Register For fast mode: the page does not query tournaments on load.
        // Resolve the placeholder only when the user actually submits registration.
        if (CURRENT_REGISTRATION_ALIAS.equals(registration.getTournamentId())) {
            registration.setTournamentId(resolveCurrentTournament().getId());
            registration.setFormat("Doubles");
        }

        // Registration is the critical path. Member lookup/create is intentionally
        // not repeated here; users can use the explicit Email Lookup before submit.
        normalizePayment(registration);
        registration.setRecordStatus("ACTIVE");
        return repository.save(registration);
    }

    @PutMapping("/{id}/attendance")
    public Registration attendance(@PathVariable String id, @RequestBody Map<String, Boolean> request) {
        Registration registration = repository.findById(id).orElseThrow();
        registration.setAttended(request.getOrDefault("attended", false));
        return repository.save(registration);
    }


    @PutMapping("/{id}/payment")
    public Registration payment(@PathVariable String id, @RequestBody Map<String, String> request) {
        Registration registration = repository.findById(id).orElseThrow();
        String status = request.getOrDefault("paymentStatus", "PENDING");
        registration.setPaymentStatus("PAID".equalsIgnoreCase(status) ? "PAID" : "PENDING");
        normalizePayment(registration);
        return repository.save(registration);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id, @RequestParam(defaultValue = "") String pin) {
        Registration registration = repository.findById(id).orElseThrow();
        if (!isValidPin(pin, registration.getTournamentId())) return ResponseEntity.status(403).body(Map.of("message", "Invalid admin PIN"));
        softDelete(registration, pin);
        return ResponseEntity.ok(Map.of("deleted", true, "softDeleted", true, "registrationId", id));
    }

    @PostMapping("/bulk-delete")
    public ResponseEntity<?> bulkDelete(@RequestBody List<String> registrationIds, @RequestParam(defaultValue = "") String pin) {
        if (registrationIds == null || registrationIds.isEmpty()) return ResponseEntity.badRequest().body(Map.of("message", "No players selected"));
        List<Registration> registrations = repository.findAllById(registrationIds);
        if (registrations.isEmpty()) return ResponseEntity.badRequest().body(Map.of("message", "No registrations found"));
        if (!isValidPin(pin, registrations.get(0).getTournamentId())) return ResponseEntity.status(403).body(Map.of("message", "Invalid admin PIN"));
        registrations.forEach(r -> softDelete(r, pin));
        return ResponseEntity.ok(Map.of("deleted", registrations.size(), "softDeleted", true));
    }

    private Tournament resolveCurrentTournament() {
        String cachedId = currentTournamentIdCache;
        if (cachedId != null && !cachedId.isBlank()) {
            Tournament cached = tournamentRepository.findById(cachedId).orElse(null);
            if (cached != null) return cached;
            currentTournamentIdCache = null;
        }

        Tournament tournament = tournamentRepository
                .findFirstByNameAndTournamentDate(CURRENT_TOURNAMENT_NAME, CURRENT_TOURNAMENT_DATE)
                .orElseThrow(() -> new IllegalStateException(
                        "CACA 9th Rolling Trophy tournament was not found. Please contact the organizer."
                ));
        currentTournamentIdCache = tournament.getId();
        return tournament;
    }

    private List<Registration> deduplicateById(List<Registration> registrations) {
        Map<String, Registration> byId = new LinkedHashMap<>();
        int noId = 0;
        for (Registration registration : registrations) {
            if (registration == null) continue;
            String key = registration.getId();
            if (key == null || key.isBlank()) key = "__noid_" + (++noId);
            byId.putIfAbsent(key, registration);
        }
        return new ArrayList<>(byId.values());
    }

    private boolean isSuperAdminPin(String pin) {
        return "1123".equals(normalizePin(pin));
    }

    private void softDelete(Registration registration, String pin) {
        registration.setRecordStatus("D"); registration.setAttended(false);
        registration.setDeletedAt(Instant.now().toString()); registration.setDeletedBy(normalizePin(pin));
        repository.save(registration);
    }
    private boolean isValidPin(String pin, String tournamentId) {
        String normalized = normalizePin(pin); if ("1123".equals(normalized)) return true;
        return tournamentRepository.findById(tournamentId).map(t -> normalized.equals(normalizePin(t.getAdminPin()))).orElse(false);
    }
    private String normalizePin(String pin) { return pin == null ? "" : pin.replaceAll("[^0-9]", ""); }
    private void normalizePayment(Registration registration) {
        double fee = registration.getFinalFee() == null ? 0.0 : registration.getFinalFee();
        if (fee <= 0.0) registration.setPaymentStatus("PAID");
        else if (!"PAID".equalsIgnoreCase(registration.getPaymentStatus())) registration.setPaymentStatus("PENDING");
    }


    private List<Registration> normalizeList(List<Registration> registrations) {
        return registrations.stream().map(this::normalizeCsvMappedRegistration).toList();
    }

    private Registration normalizeCsvMappedRegistration(Registration registration) {
        if (registration == null) return null;

        String playerName = safe(registration.getPlayerName());
        String email = safe(registration.getEmail());
        String phone = safe(registration.getPhone());
        String format = safe(registration.getFormat());

        // Defensive repair for old bad CSV uploads:
        // #, Player, Format, Email, Phone, Payment
        // accidentally mapped as playerName=#, email=Player, phone=Format.
        boolean badName = playerName.equals("#") || playerName.matches("\\d+");
        boolean emailLooksLikeName = !email.contains("@") && email.matches(".*[A-Za-z].*");
        boolean phoneLooksLikeFormat = isKnownFormat(phone);

        if (badName && emailLooksLikeName) {
            registration.setPlayerName(email);
            registration.setEmail("");
            if (phoneLooksLikeFormat) {
                registration.setFormat(phone);
                registration.setPhone("");
            }
        }

        if (registration.getFormat() == null || registration.getFormat().isBlank()) {
            registration.setFormat(format.isBlank() ? "Singles" : format);
        }

        return registration;
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean isKnownFormat(String value) {
        String v = safe(value).toLowerCase();
        return v.equals("singles") || v.equals("doubles") || v.equals("mixed doubles") || v.equals("team event");
    }


}
