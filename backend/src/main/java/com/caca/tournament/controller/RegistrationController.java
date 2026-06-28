package com.caca.tournament.controller;

import com.caca.tournament.model.Registration;
import com.caca.tournament.repository.RegistrationRepository;
import com.caca.tournament.service.MemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/registrations")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class RegistrationController {
    private final RegistrationRepository repository;
    private final MemberService memberService;

    @GetMapping("/tournament/{tournamentId}")
    public List<Registration> byTournament(@PathVariable String tournamentId) {
        return normalizeList(repository.findByTournamentId(tournamentId));
    }

    @GetMapping("/tournament/{tournamentId}/{format}")
    public List<Registration> byTournamentAndFormat(@PathVariable String tournamentId, @PathVariable String format) {
        return normalizeList(repository.findByTournamentIdAndFormat(tournamentId, format));
    }

    @PostMapping
    public Registration register(@Valid @RequestBody Registration registration) {
        registration = normalizeCsvMappedRegistration(registration);
        memberService.applyMemberToRegistration(registration);
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
        return repository.save(registration);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id, @RequestParam(defaultValue = "") String pin) {
        if (!"1123".equals(pin)) return ResponseEntity.status(403).body("Invalid admin PIN");
        repository.deleteById(id);
        return ResponseEntity.ok(Map.of("deleted", true, "registrationId", id));
    }

    @PostMapping("/bulk-delete")
    public ResponseEntity<?> bulkDelete(@RequestBody List<String> registrationIds,
                                        @RequestParam(defaultValue = "") String pin) {
        if (pin == null || !pin.replaceAll("[^0-9]", "").matches("\\d{4}")) return ResponseEntity.status(403).body(Map.of("message", "Invalid admin PIN"));
        if (registrationIds == null || registrationIds.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "No players selected"));
        }
        registrationIds.stream()
                .filter(id -> id != null && !id.isBlank())
                .forEach(repository::deleteById);
        return ResponseEntity.ok(Map.of("deleted", registrationIds.size()));
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
