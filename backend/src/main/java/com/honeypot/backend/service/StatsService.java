package com.honeypot.backend.service;

import com.honeypot.backend.repository.StatsRepository;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class StatsService {

    private final StatsRepository statsRepository;

    public StatsService(StatsRepository statsRepository) {
        this.statsRepository = statsRepository;
    }

    public Map<String, Long> getSummary() {
        Map<String, Long> summary = new LinkedHashMap<>();
        summary.put("totalAttacks", statsRepository.countAttacks());
        summary.put("totalAuthLogs", statsRepository.countAuthLogs());
        summary.put("totalCommandLogs", statsRepository.countCommandLogs());
        summary.put("uniqueAttackerIps", statsRepository.countUniqueAttackerIps());
        return summary;
    }

    public List<Map<String, Object>> getMethodDistribution() {
        return statsRepository.getMethodDistribution().stream()
                .map(row -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("method", row[0]);
                    map.put("count", row[1]);
                    return map;
                }).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getTopEndpoints() {
        return statsRepository.getTopEndpoints().stream()
                .map(row -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("endpoint", row[0]);
                    map.put("count", row[1]);
                    return map;
                }).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getTopAttackerIps() {
        return statsRepository.getTopAttackerIps().stream()
                .map(row -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("ip", row[0]);
                    map.put("count", row[1]);
                    return map;
                }).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getStatusCodeDistribution() {
        return statsRepository.getStatusCodeDistribution().stream()
                .map(row -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("statusCode", row[0]);
                    map.put("count", row[1]);
                    return map;
                }).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getAuthStatusDistribution() {
        return statsRepository.getAuthStatusDistribution().stream()
                .map(row -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("status", row[0]);
                    map.put("count", row[1]);
                    return map;
                }).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getTopUsernames() {
        return statsRepository.getTopUsernames().stream()
                .map(row -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("username", row[0]);
                    map.put("count", row[1]);
                    return map;
                }).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getAttackTimeline() {
        return statsRepository.getAttackTimeline().stream()
                .map(row -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("hour", row[0]);
                    map.put("count", row[1]);
                    return map;
                }).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getBruteForceDetection() {
        return statsRepository.getBruteForceDetection().stream()
                .map(row -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("ip", row[0]);
                    map.put("failedAttempts", row[1]);
                    map.put("firstSeen", row[2] != null ? row[2].toString() : null);
                    map.put("lastSeen", row[3] != null ? row[3].toString() : null);
                    return map;
                }).collect(Collectors.toList());
    }
}
