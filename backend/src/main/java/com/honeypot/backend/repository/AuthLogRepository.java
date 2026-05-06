package com.honeypot.backend.repository;

import com.honeypot.backend.model.AuthLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AuthLogRepository extends JpaRepository<AuthLog, Long> {

    @Query(value = "SELECT * FROM auth_logs WHERE " +
            "(:username IS NULL OR LOWER(username) LIKE LOWER(CONCAT('%', :username, '%'))) AND " +
            "(:ip IS NULL OR LOWER(source_ip) LIKE LOWER(CONCAT('%', :ip, '%'))) AND " +
            "(:status IS NULL OR LOWER(status) LIKE LOWER(CONCAT('%', :status, '%'))) AND " +
            "(CAST(:dateFrom AS timestamp) IS NULL OR timestamp >= :dateFrom) AND " +
            "(CAST(:dateTo AS timestamp) IS NULL OR timestamp <= :dateTo)",
    countQuery = "SELECT COUNT(*) FROM auth_logs WHERE " +
            "(:username IS NULL OR LOWER(username) LIKE LOWER(CONCAT('%', :username, '%'))) AND " +
            "(:ip IS NULL OR LOWER(source_ip) LIKE LOWER(CONCAT('%', :ip, '%'))) AND " +
            "(:status IS NULL OR LOWER(status) LIKE LOWER(CONCAT('%', :status, '%'))) AND " +
            "(CAST(:dateFrom AS timestamp) IS NULL OR timestamp >= :dateFrom) AND " +
            "(CAST(:dateTo AS timestamp) IS NULL OR timestamp <= :dateTo)",
    nativeQuery = true)
    Page<AuthLog> search(@Param("username") String username,
                         @Param("ip") String ip,
                         @Param("status") String status,
                         @Param("dateFrom") LocalDateTime dateFrom,
                         @Param("dateTo") LocalDateTime dateTo,
                         Pageable pageable);
}
