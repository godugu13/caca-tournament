package com.caca.tournament.controller;

import com.caca.tournament.model.Registration;
import com.caca.tournament.model.Tournament;
import com.caca.tournament.repository.RegistrationRepository;
import com.caca.tournament.repository.TournamentRepository;
import com.caca.tournament.service.MemberService;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/roster")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class RosterUploadController {
    private static final String SUPER_ADMIN_PIN = "1123";
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("txt", "csv", "xls", "xlsx");

    private final RegistrationRepository registrationRepository;
    private final TournamentRepository tournamentRepository;
    private final MemberService memberService;

    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam String tournamentId,
                                    @RequestParam(required = false, defaultValue = "") String format,
                                    @RequestParam(defaultValue = "") String pin,
                                    @RequestParam("file") MultipartFile file) {
        Optional<Tournament> tournamentOptional = tournamentRepository.findById(tournamentId);
        if (tournamentOptional.isEmpty()) return ResponseEntity.badRequest().body("Tournament not found");
        Tournament tournament = tournamentOptional.get();
        if (!validPin(pin, tournament)) return ResponseEntity.status(403).body("Invalid tournament admin PIN");
        if (file.isEmpty()) return ResponseEntity.badRequest().body("Please choose a roster file");

        String extension = extension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            return ResponseEntity.badRequest().body("Supported files: .txt, .csv, .xls, .xlsx");
        }

        try {
            List<RosterRow> rows = parseFile(file, extension);
            if (rows.isEmpty()) return ResponseEntity.badRequest().body("No player rows were found in the uploaded file");

            List<Registration> existing = activeRegistrations(tournamentId);
            Set<String> existingKeys = existing.stream().map(this::registrationKey).collect(Collectors.toSet());
            List<Registration> saved = new ArrayList<>();
            List<String> errors = new ArrayList<>();
            int skippedBlank = 0;
            int skippedDuplicate = 0;
            int rowNumber = 1;

            for (RosterRow row : rows) {
                rowNumber++;
                if (blank(row.primaryName)) {
                    skippedBlank++;
                    continue;
                }

                String rowFormat = firstNonBlank(row.format, format, firstTournamentFormat(tournament));
                if (!isTournamentFormat(tournament, rowFormat)) {
                    errors.add("Row " + rowNumber + ": format '" + rowFormat + "' is not enabled for this tournament");
                    continue;
                }

                Registration r = new Registration();
                r.setTournamentId(tournamentId);
                r.setFormat(rowFormat);
                r.setPlayerName(clean(row.primaryName));
                r.setPartnerName(clean(row.partnerName));
                r.setEmail(clean(row.email));
                r.setPhone(cleanPhone(row.phone));
                r.setPaymentStatus(normalizePayment(row.paymentStatus, row.finalFee, tournament.getRegistrationFee()));
                r.setFinalFee(resolveFinalFee(row.finalFee, tournament.getRegistrationFee()));
                r.setDiscountAmount(row.discountAmount == null ? 0.0 : Math.max(0.0, row.discountAmount));
                r.setAttended(false);
                r.setRecordStatus("ACTIVE");
                memberService.applyMemberToRegistration(r);

                String key = registrationKey(r);
                if (existingKeys.contains(key)) {
                    skippedDuplicate++;
                    continue;
                }
                saved.add(registrationRepository.save(r));
                existingKeys.add(key);
            }

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("uploaded", saved.size());
            response.put("duplicatesSkipped", skippedDuplicate);
            response.put("blankRowsSkipped", skippedBlank);
            response.put("errors", errors);
            response.put("registrations", saved);
            return ResponseEntity.ok(response);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body("Roster upload failed: " + ex.getMessage());
        }
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportRegistrations(@RequestParam String tournamentId,
                                                       @RequestParam(required = false, defaultValue = "") String format) {
        Optional<Tournament> tournamentOptional = tournamentRepository.findById(tournamentId);
        if (tournamentOptional.isEmpty()) return ResponseEntity.notFound().build();
        Tournament tournament = tournamentOptional.get();

        List<Registration> registrations = activeRegistrations(tournamentId).stream()
                .filter(r -> blank(format) || format.equalsIgnoreCase(r.getFormat()))
                .sorted(Comparator.comparing((Registration r) -> safe(r.getFormat()))
                        .thenComparing(r -> safe(r.getPlayerName()), String.CASE_INSENSITIVE_ORDER))
                .toList();

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Registered Players");
            String[] headers = {"#", "Player", "Format", "Partner", "Email", "Phone", "Final Fee", "Payment"};

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            Row header = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int index = 1;
            for (Registration registration : registrations) {
                Row row = sheet.createRow(index);
                row.createCell(0).setCellValue(index);
                row.createCell(1).setCellValue(safe(registration.getPlayerName()));
                row.createCell(2).setCellValue(safe(registration.getFormat()));
                row.createCell(3).setCellValue(safe(registration.getPartnerName()));
                row.createCell(4).setCellValue(safe(registration.getEmail()));
                row.createCell(5).setCellValue(safe(registration.getPhone()));
                row.createCell(6).setCellValue(registration.getFinalFee() == null ? 0.0 : registration.getFinalFee());
                row.createCell(7).setCellValue(safe(firstNonBlank(registration.getPaymentStatus(), "PENDING")));
                index++;
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
                sheet.setColumnWidth(i, Math.min(sheet.getColumnWidth(i) + 800, 15000));
            }
            sheet.createFreezePane(0, 1);
            workbook.write(out);

            String tournamentName = safeFileName(tournament.getName());
            String suffix = blank(format) ? "all-formats" : safeFileName(format);
            String filename = tournamentName + "-registered-players-" + suffix + ".xlsx";
            HttpHeaders headersOut = new HttpHeaders();
            headersOut.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headersOut.setContentDisposition(ContentDisposition.attachment().filename(filename).build());
            return ResponseEntity.ok().headers(headersOut).body(out.toByteArray());
        } catch (Exception ex) {
            return ResponseEntity.internalServerError().body(("Export failed: " + ex.getMessage()).getBytes(StandardCharsets.UTF_8));
        }
    }

    private List<RosterRow> parseFile(MultipartFile file, String extension) throws Exception {
        return ("xlsx".equals(extension) || "xls".equals(extension)) ? parseExcel(file) : parseText(file);
    }

    private List<RosterRow> parseText(MultipartFile file) throws Exception {
        List<RosterRow> rows = new ArrayList<>();
        try (BufferedReader br = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            Map<String, Integer> header = null;
            while ((line = br.readLine()) != null) {
                line = stripBom(line).trim();
                if (line.isBlank()) continue;
                String[] parts = splitTextLine(line);
                if (header == null && looksLikeHeader(parts)) {
                    header = headerMap(parts);
                    continue;
                }
                rows.add(rowFromParts(parts, header));
            }
        }
        return rows;
    }

    private String[] splitTextLine(String line) {
        if (line.contains("\t")) return line.split("\t", -1);
        if (line.contains("|")) return line.split("\\|", -1);
        if (line.contains(",")) return parseCsvLine(line).toArray(new String[0]);
        return new String[]{line};
    }

    private List<String> parseCsvLine(String line) {
        List<String> values = new ArrayList<>();
        StringBuilder value = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '"') {
                if (quoted && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    value.append('"');
                    i++;
                } else quoted = !quoted;
            } else if (ch == ',' && !quoted) {
                values.add(value.toString());
                value.setLength(0);
            } else value.append(ch);
        }
        values.add(value.toString());
        return values;
    }

    private List<RosterRow> parseExcel(MultipartFile file) throws Exception {
        List<RosterRow> rows = new ArrayList<>();
        DataFormatter formatter = new DataFormatter();
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            Map<String, Integer> header = null;
            for (Row row : sheet) {
                int last = Math.max(1, row.getLastCellNum());
                String[] parts = new String[last];
                for (int i = 0; i < last; i++) parts[i] = formatter.formatCellValue(row.getCell(i)).trim();
                if (Arrays.stream(parts).allMatch(String::isBlank)) continue;
                if (header == null && looksLikeHeader(parts)) {
                    header = headerMap(parts);
                    continue;
                }
                rows.add(rowFromParts(parts, header));
            }
        }
        return rows;
    }

    private boolean looksLikeHeader(String[] parts) {
        Set<String> known = Set.of("#", "player", "player name", "full name", "name", "format", "partner", "partner name", "email", "e-mail", "phone", "mobile", "phone number", "payment", "payment status", "final fee", "fee");
        return Arrays.stream(parts).map(this::normalizeHeader).anyMatch(known::contains);
    }

    private Map<String, Integer> headerMap(String[] parts) {
        Map<String, Integer> map = new HashMap<>();
        for (int i = 0; i < parts.length; i++) map.put(normalizeHeader(parts[i]), i);
        return map;
    }

    private RosterRow rowFromParts(String[] parts, Map<String, Integer> header) {
        RosterRow r = new RosterRow();
        if (header == null) {
            r.primaryName = val(parts, 0);
            r.partnerName = val(parts, 1);
            r.email = val(parts, 2);
            r.phone = val(parts, 3);
            r.format = val(parts, 4);
            r.paymentStatus = val(parts, 5);
            r.finalFee = decimal(val(parts, 6));
        } else {
            r.primaryName = byHeader(parts, header, "player", "player name", "full name", "name");
            r.format = byHeader(parts, header, "format");
            r.partnerName = byHeader(parts, header, "partner", "partner name");
            r.email = byHeader(parts, header, "email", "e-mail");
            r.phone = byHeader(parts, header, "phone", "mobile", "phone number");
            r.paymentStatus = byHeader(parts, header, "payment", "payment status", "paid");
            r.finalFee = decimal(byHeader(parts, header, "final fee", "fee"));
            r.discountAmount = decimal(byHeader(parts, header, "discount", "discount amount"));
        }
        if (!blank(r.primaryName) && r.primaryName.contains("/")) {
            String[] names = r.primaryName.split("/", 2);
            r.primaryName = names[0].trim();
            if (blank(r.partnerName) && names.length > 1) r.partnerName = names[1].trim();
        }
        return r;
    }

    private List<Registration> activeRegistrations(String tournamentId) {
        return registrationRepository.findByTournamentId(tournamentId).stream()
                .filter(r -> !"D".equalsIgnoreCase(r.getRecordStatus()))
                .toList();
    }

    private boolean validPin(String pin, Tournament tournament) {
        return SUPER_ADMIN_PIN.equals(pin) || (!blank(tournament.getAdminPin()) && tournament.getAdminPin().equals(pin));
    }

    private boolean isTournamentFormat(Tournament tournament, String format) {
        if (blank(format)) return false;
        if (tournament.getFormats() != null && !tournament.getFormats().isEmpty()) {
            return tournament.getFormats().stream().anyMatch(f -> f.equalsIgnoreCase(format));
        }
        return !blank(tournament.getTournamentType()) && tournament.getTournamentType().equalsIgnoreCase(format);
    }

    private String firstTournamentFormat(Tournament tournament) {
        if (tournament.getFormats() != null && !tournament.getFormats().isEmpty()) return tournament.getFormats().get(0);
        return firstNonBlank(tournament.getTournamentType(), "Singles");
    }

    private String registrationKey(Registration r) {
        return String.join("|", safe(r.getPlayerName()), safe(r.getFormat()), safe(r.getPartnerName()), safe(r.getEmail()))
                .trim().toLowerCase(Locale.ROOT);
    }

    private String normalizePayment(String payment, Double rowFee, Double tournamentFee) {
        double fee = resolveFinalFee(rowFee, tournamentFee);
        if (fee <= 0) return "PAID";
        String p = safe(payment).toUpperCase(Locale.ROOT);
        return (p.equals("PAID") || p.equals("YES") || p.equals("Y") || p.equals("TRUE")) ? "PAID" : "PENDING";
    }

    private double resolveFinalFee(Double rowFee, Double tournamentFee) {
        if (rowFee != null) return Math.max(0.0, rowFee);
        return Math.max(0.0, tournamentFee == null ? 0.0 : tournamentFee);
    }

    private String byHeader(String[] parts, Map<String, Integer> header, String... names) {
        for (String name : names) {
            Integer index = header.get(normalizeHeader(name));
            if (index != null) return val(parts, index);
        }
        return null;
    }

    private String val(String[] parts, int index) {
        if (parts == null || index < 0 || index >= parts.length || parts[index] == null) return null;
        String value = parts[index].trim();
        return value.isBlank() ? null : value;
    }

    private Double decimal(String value) {
        if (blank(value)) return null;
        try { return Double.parseDouble(value.replace("$", "").replace(",", "").trim()); }
        catch (NumberFormatException ignored) { return null; }
    }

    private String extension(String filename) {
        String value = safe(filename).toLowerCase(Locale.ROOT);
        int dot = value.lastIndexOf('.');
        return dot >= 0 ? value.substring(dot + 1) : "";
    }

    private String normalizeHeader(String value) {
        return safe(value).replace("\uFEFF", "").trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private String stripBom(String value) { return value == null ? "" : value.replace("\uFEFF", ""); }
    private String clean(String value) { return blank(value) ? null : value.trim(); }
    private String cleanPhone(String value) { return blank(value) ? null : value.trim().replaceAll("\\.0$", ""); }
    private String safe(String value) { return value == null ? "" : value; }
    private boolean blank(String value) { return value == null || value.trim().isEmpty(); }
    private String firstNonBlank(String... values) { for (String value : values) if (!blank(value)) return value.trim(); return ""; }
    private String safeFileName(String value) { String cleaned = safe(value).trim().replaceAll("[^A-Za-z0-9._-]+", "-"); return cleaned.isBlank() ? "tournament" : cleaned; }

    static class RosterRow {
        String primaryName;
        String partnerName;
        String email;
        String phone;
        String format;
        String paymentStatus;
        Double finalFee;
        Double discountAmount;
    }
}
