package com.honeypot.backend.controller;

import com.honeypot.backend.model.AuthLog;
import com.honeypot.backend.service.AuthLogService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/auth-logs")
public class AuthLogController {

    private final AuthLogService authLogService;

    public AuthLogController(AuthLogService authLogService) {
        this.authLogService = authLogService;
    }

    @GetMapping
    public List<AuthLog> getAll() {
        return authLogService.getAllAuthLogs();
    }

    @GetMapping("/search")
    public List<AuthLog> search(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String ip,
            @RequestParam(required = false) String status
    ) {
        return authLogService.search(username, ip, status);
    }
}