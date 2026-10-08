package io.dartchain.backend.access.infrastructure.web;

import io.dartchain.backend.access.application.IpBanService;
import io.dartchain.backend.web.RequestClientInfo;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/access")
public class AccessController {

    private final IpBanService ipBanService;

    public AccessController(IpBanService ipBanService) {
        this.ipBanService = ipBanService;
    }

    @GetMapping("/status")
    public Map<String, Object> status(HttpServletRequest request) {
        String ip = RequestClientInfo.clientIp(request);
        boolean banned = ipBanService.isBanned(ip);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("banned", banned);
        body.put("reason", banned ? "age_decline" : null);
        return body;
    }

    @PostMapping("/age-decline")
    public ResponseEntity<Map<String, Object>> ageDecline(HttpServletRequest request) {
        String ip = RequestClientInfo.clientIp(request);
        ipBanService.ban(ip, "age_decline", request.getHeader("User-Agent"));
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("banned", true);
        body.put("reason", "age_decline");
        body.put("message", "Accès refusé. Cette adresse IP est bannie.");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }
}
