package com.honeypot.backend.controller;

import com.honeypot.backend.model.AuthLog;
import com.honeypot.backend.service.AuthLogService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
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
    public Page<AuthLog> search(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String ip,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso =
                    DateTimeFormat.ISO.DATE_TIME)LocalDateTime dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso =
                    DateTimeFormat.ISO.DATE_TIME)LocalDateTime dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "timestamp") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        Sort sort = direction.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return authLogService.search(username, ip, status,
                dateFrom, dateTo, pageable);
    }
}