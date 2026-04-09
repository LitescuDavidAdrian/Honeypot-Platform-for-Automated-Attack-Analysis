package com.honeypot.backend.controller;

import com.honeypot.backend.model.Attack;
import com.honeypot.backend.service.AttackService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/attacks")
public class AttackController {

    private final AttackService attackService;

    public AttackController(AttackService attackService) {
        this.attackService = attackService;
    }

    // Get all
    @GetMapping
    public List<Attack> getAll() {
        return attackService.getAllAttacks();
    }

    @GetMapping("/search")
    public List<Attack> search(
            @RequestParam(required = false) String endpoint,
            @RequestParam(required = false) String ip,
            @RequestParam(required = false) Integer status
    ) {
        return attackService.search(endpoint, ip, status);
    }
}
