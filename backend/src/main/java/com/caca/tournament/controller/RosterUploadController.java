package com.caca.tournament.controller;

import com.caca.tournament.model.Registration;
import com.caca.tournament.repository.RegistrationRepository;
import com.caca.tournament.service.MemberService;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

@RestController
@RequestMapping("/api/roster")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class RosterUploadController {
    private final RegistrationRepository registrationRepository;
    private final MemberService memberService;

    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam String tournamentId,
                                    @RequestParam String format,
                                    @RequestParam(defaultValue = "") String pin,
                                    @RequestParam("file") MultipartFile file) {
        if (!"1123".equals(pin)) return ResponseEntity.status(403).body("Invalid admin PIN");
        if (file.isEmpty()) return ResponseEntity.badRequest().body("Please choose a roster file");
        try {
            List<RosterRow> rows = parseFile(file);
            List<Registration> saved = new ArrayList<>();
            for (RosterRow row : rows) {
                if (row.primaryName == null || row.primaryName.isBlank()) continue;
                Registration r = new Registration();
                r.setTournamentId(tournamentId);
                r.setFormat(format);
                r.setPlayerName(row.primaryName.trim());
                r.setPartnerName(row.partnerName);
                r.setEmail(row.email);
                r.setPhone(row.phone);
                r.setPaymentStatus("PENDING");
                r.setAttended(false);
                memberService.applyMemberToRegistration(r);
                saved.add(registrationRepository.save(r));
            }
            return ResponseEntity.ok(Map.of("uploaded", saved.size(), "registrations", saved));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body("Roster upload failed: " + ex.getMessage());
        }
    }

    private List<RosterRow> parseFile(MultipartFile file) throws Exception {
        String name = Optional.ofNullable(file.getOriginalFilename()).orElse("").toLowerCase();
        if (name.endsWith(".xlsx") || name.endsWith(".xls")) return parseExcel(file);
        return parseText(file);
    }

    private List<RosterRow> parseText(MultipartFile file) throws Exception {
        List<RosterRow> rows = new ArrayList<>();
        try (BufferedReader br = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            boolean first = true;
            while ((line = br.readLine()) != null) {
                line = line.trim();
                if (line.isBlank()) continue;
                String[] parts = line.contains("\t") ? line.split("\\t") : line.split(",");
                if (first && looksLikeHeader(parts)) { first = false; continue; }
                first = false;
                rows.add(rowFromParts(parts));
            }
        }
        return rows;
    }

    private List<RosterRow> parseExcel(MultipartFile file) throws Exception {
        List<RosterRow> rows = new ArrayList<>();
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            boolean first = true;
            for (Row row : sheet) {
                List<String> parts = new ArrayList<>();
                for (int i = 0; i < Math.max(4, row.getLastCellNum()); i++) {
                    parts.add(cell(row.getCell(i)));
                }
                if (parts.stream().allMatch(String::isBlank)) continue;
                if (first && looksLikeHeader(parts.toArray(new String[0]))) { first = false; continue; }
                first = false;
                rows.add(rowFromParts(parts.toArray(new String[0])));
            }
        }
        return rows;
    }

    private boolean looksLikeHeader(String[] parts) {
        String joined = String.join(" ", parts).toLowerCase();
        return joined.contains("name") || joined.contains("email") || joined.contains("phone") || joined.contains("team");
    }

    private RosterRow rowFromParts(String[] parts) {
        RosterRow r = new RosterRow();
        r.primaryName = val(parts, 0);
        r.partnerName = val(parts, 1);
        r.email = val(parts, 2);
        r.phone = val(parts, 3);
        if (r.primaryName != null && r.primaryName.contains("/")) {
            String[] names = r.primaryName.split("/");
            r.primaryName = names[0].trim();
            if ((r.partnerName == null || r.partnerName.isBlank()) && names.length > 1) r.partnerName = names[1].trim();
        }
        return r;
    }

    private String val(String[] parts, int index) {
        if (parts == null || index >= parts.length || parts[index] == null) return null;
        String v = parts[index].trim();
        return v.isBlank() ? null : v;
    }

    private String cell(Cell cell) {
        if (cell == null) return "";
        cell.setCellType(CellType.STRING);
        return cell.getStringCellValue() == null ? "" : cell.getStringCellValue().trim();
    }

    static class RosterRow {
        String primaryName;
        String partnerName;
        String email;
        String phone;
    }
}
