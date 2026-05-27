package com.honeypot.backend.controller;

import com.honeypot.backend.service.StatsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/stats")
public class StatsController {

    private final StatsService statsService;

    public StatsController(StatsService statsService) {
        this.statsService = statsService;
    }

    // Summary cards
    @GetMapping("/summary")
    public Map<String, Long> getSummary() {
        return statsService.getSummary();
    }

    // HTTP method distribution (for pie chart)
    @GetMapping("/attacks/methods")
    public List<Map<String, Object>> getMethodDistribution() {
        return statsService.getMethodDistribution();
    }

    // Top 10 targeted endpoints (for bar chart)
    @GetMapping("/attacks/top-endpoints")
    public List<Map<String, Object>> getTopEndpoints() {
        return statsService.getTopEndpoints();
    }

    // Top 10 attacker IPs (for bar chart)
    @GetMapping("/attacks/top-ips")
    public List<Map<String, Object>> getTopAttackerIps() {
        return statsService.getTopAttackerIps();
    }

    // Status code distribution (for pie chart)
    @GetMapping("/attacks/status-codes")
    public List<Map<String, Object>> getStatusCodeDistribution() {
        return statsService.getStatusCodeDistribution();
    }

    // Auth log status distribution (for pie chart)
    @GetMapping("/auth/status-distribution")
    public List<Map<String, Object>> getAuthStatusDistribution() {
        return statsService.getAuthStatusDistribution();
    }

    // Top attempted usernames (for bar chart)
    @GetMapping("/auth/top-usernames")
    public List<Map<String, Object>> getTopUsernames() {
        return statsService.getTopUsernames();
    }

    // Attacks per hour timeline (for line chart)
    @GetMapping("/attacks/timeline")
    public List<Map<String, Object>> getAttackTimeline() {
        return statsService.getAttackTimeline();
    }

    // Brute force detection
    @GetMapping("/auth/brute-force")
    public List<Map<String, Object>> getBruteForceDetection() {
        return statsService.getBruteForceDetection();
    }
}
