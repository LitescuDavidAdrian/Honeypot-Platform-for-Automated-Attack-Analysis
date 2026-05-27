package com.honeypot.backend.repository;

import com.honeypot.backend.model.Attack;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface StatsRepository extends JpaRepository<Attack, Long> {

    // Summary counts
    @Query(value = "SELECT COUNT(*) FROM attacks", nativeQuery = true)
    Long countAttacks();

    @Query(value = "SELECT COUNT(*) FROM auth_logs", nativeQuery = true)
    Long countAuthLogs();

    @Query(value = "SELECT COUNT(*) FROM command_logs", nativeQuery = true)
    Long countCommandLogs();

    @Query(value = "SELECT COUNT(DISTINCT attacker_ip) FROM attacks", nativeQuery = true)
    Long countUniqueAttackerIps();


    // Attack breakdown
    @Query(value = "SELECT http_method, COUNT(*) FROM attacks GROUP BY http_method ORDER BY COUNT(*) DESC", nativeQuery = true)
    List<Object[]> getMethodDistribution();

    @Query(value = "SELECT endpoint, COUNT(*) FROM attacks GROUP BY endpoint ORDER BY COUNT(*) DESC LIMIT 10", nativeQuery = true)
    List<Object[]> getTopEndpoints();

    @Query(value = "SELECT attacker_ip, COUNT(*) FROM attacks GROUP BY attacker_ip ORDER BY COUNT(*) DESC LIMIT 10", nativeQuery = true)
    List<Object[]> getTopAttackerIps();

    @Query(value = "SELECT status_code, COUNT(*) FROM attacks GROUP BY status_code ORDER BY COUNT(*) DESC", nativeQuery = true)
    List<Object[]> getStatusCodeDistribution();


    // Auth logs breakdown
    @Query(value = "SELECT status, COUNT(*) FROM auth_logs GROUP BY status ORDER BY COUNT(*) DESC", nativeQuery = true)
    List<Object[]> getAuthStatusDistribution();

    @Query(value = "SELECT username, COUNT(*) FROM auth_logs GROUP BY username ORDER BY COUNT(*) DESC LIMIT 10", nativeQuery = true)
    List<Object[]> getTopUsernames();


    // Timeline
    @Query(value = "SELECT date_trunc('hour', timestamp) AS hour, COUNT(*) FROM attacks GROUP BY hour ORDER BY hour", nativeQuery = true)
    List<Object[]> getAttackTimeline();


    // Brute force detection
    // Flags IPs with more than 5 failed login attempts
    @Query(value = "SELECT source_ip, COUNT(*) AS failed_attempts, " +
    "MIN(timestamp) AS first_seen, MAX(timestamp) AS last_seen " +
    "FROM auth_logs WHERE status = 'FAILED' OR status = 'INVALID_USER' " +
    "GROUP BY source_ip HAVING COUNT(*) > 5 " +
    "ORDER BY failed_attempts DESC", nativeQuery = true)
    List<Object[]> getBruteForceDetection();
}
