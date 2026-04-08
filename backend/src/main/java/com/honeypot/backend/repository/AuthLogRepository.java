package com.honeypot.backend.repository;

import com.honeypot.backend.model.AuthLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuthLogRepository extends JpaRepository<AuthLog, Long> {
    List<AuthLog> findByUsername(String username);
    List<AuthLog> findBySourceIp(String sourceIp);
    List<AuthLog> findByStatus(String status);
}
