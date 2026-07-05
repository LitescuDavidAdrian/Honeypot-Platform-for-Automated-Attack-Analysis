package com.honeypot.backend.controller;

import com.honeypot.backend.model.Attack;
import com.honeypot.backend.service.AttackService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/attacks")
public class AttackController {

    private final AttackService attackService;

    public AttackController(AttackService attackService) {
        this.attackService = attackService;
    }

    // Get all
    @GetMapping
    public Page<Attack> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "timestamp") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        Sort sort = direction.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);
        return attackService.getAllAttacks(pageable);
    }

    @GetMapping("/search")
    public Page<Attack> search(
            @RequestParam(required = false) String endpoint,
            @RequestParam(required = false) String ip,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) String httpMethod,
            @RequestParam(required = false) @DateTimeFormat(iso =
                    DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso =
                    DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "timestamp") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        Sort sort = direction.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return attackService.search(endpoint, ip, status, httpMethod,
                dateFrom, dateTo, pageable);
    }
}
