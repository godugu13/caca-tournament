package com.caca.tournament.service;

import com.caca.tournament.dto.ScoreAuditMetaRequest;
import com.caca.tournament.model.Match;
import com.caca.tournament.model.ScoreAudit;
import com.caca.tournament.repository.ScoreAuditRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ScoreAuditService {
    private final ScoreAuditRepository repository;

    public void record(Match match, String updatedByPhone, String updatedByRole) {
        record(match, updatedByPhone, updatedByRole, null, null);
    }

    public void record(Match match, String updatedByPhone, String updatedByRole, HttpServletRequest request, ScoreAuditMetaRequest meta) {
        if (match == null) return;

        ScoreAudit audit = new ScoreAudit();
        audit.setMatchId(match.getId());
        audit.setTournamentId(match.getTournamentId());
        audit.setFormat(match.getFormat());
        audit.setRoundType(match.getRoundType());
        audit.setRoundNumber(match.getRoundNumber());
        audit.setBoardNumber(match.getBoardNumber());
        audit.setUpdatedByPhone(updatedByPhone);
        audit.setUpdatedByRole(updatedByRole);
        audit.setPlayer1Score(match.getPlayer1Score());
        audit.setPlayer2Score(match.getPlayer2Score());
        audit.setFinalized(match.getScoreFinalized());

        if (request != null) {
            String userAgent = request.getHeader("User-Agent");
            audit.setIpAddress(resolveClientIp(request));
            audit.setUserAgent(userAgent);
            audit.setDeviceInfo(parseDevice(userAgent));
            audit.setBrowser(parseBrowser(userAgent));
            audit.setOs(parseOs(userAgent));
        }

        if (meta != null) {
            audit.setLatitude(meta.getLatitude());
            audit.setLongitude(meta.getLongitude());
            audit.setGeoLocation(meta.getGeoLocation());
            audit.setActionType(meta.getActionType());
        }

        if (audit.getActionType() == null || audit.getActionType().isBlank()) {
            audit.setActionType(Boolean.TRUE.equals(match.getScoreFinalized()) ? "FINALIZE" : "SAVE");
        }

        repository.save(audit);
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }

        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }

        return request.getRemoteAddr();
    }

    private String parseDevice(String userAgent) {
        if (userAgent == null) return "Unknown";
        String ua = userAgent.toLowerCase();
        if (ua.contains("iphone")) return "iPhone";
        if (ua.contains("ipad")) return "iPad";
        if (ua.contains("android")) return "Android";
        if (ua.contains("windows")) return "Windows";
        if (ua.contains("mac os")) return "Mac";
        return "Unknown";
    }

    private String parseBrowser(String userAgent) {
        if (userAgent == null) return "Unknown";
        String ua = userAgent.toLowerCase();
        if (ua.contains("edg/")) return "Edge";
        if (ua.contains("chrome/") && !ua.contains("edg/")) return "Chrome";
        if (ua.contains("safari/") && !ua.contains("chrome/")) return "Safari";
        if (ua.contains("firefox/")) return "Firefox";
        return "Unknown";
    }

    private String parseOs(String userAgent) {
        if (userAgent == null) return "Unknown";
        String ua = userAgent.toLowerCase();
        if (ua.contains("android")) return "Android";
        if (ua.contains("iphone") || ua.contains("ipad")) return "iOS";
        if (ua.contains("windows")) return "Windows";
        if (ua.contains("mac os")) return "macOS";
        return "Unknown";
    }
}
