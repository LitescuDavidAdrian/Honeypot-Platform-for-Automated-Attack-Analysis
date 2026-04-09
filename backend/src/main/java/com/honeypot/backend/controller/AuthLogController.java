package com.honeypot.backend.controller;

import com.honeypot.backend.model.AuthLog;
import com.honeypot.backend.service.AuthLogService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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
    public Page<AuthLog> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "timestamp") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        Sort sort = direction.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);
        return authLogService.getAllAuthLogs(pageable);
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