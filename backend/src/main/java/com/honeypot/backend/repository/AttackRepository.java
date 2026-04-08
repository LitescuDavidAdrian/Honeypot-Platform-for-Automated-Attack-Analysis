package com.honeypot.backend.repository;

import com.honeypot.backend.model.Attack;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AttackRepository extends JpaRepository<Attack, Long> {

    // Useful queries
    List<Attack> findByAttackerIp(String attackerIp);

    List<Attack> findByStatusCode(Integer statusCode);

    List<Attack> findByEndpoint(String endpoint);
}
