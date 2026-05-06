package com.honeypot.backend.repository;

import com.honeypot.backend.model.Attack;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AttackRepository extends JpaRepository<Attack, Long> {

    @Query(value = "SELECT * FROM attacks WHERE " +
            "(:endpoint IS NULL OR LOWER(endpoint) LIKE LOWER(CONCAT('%', :endpoint, '%'))) AND " +
            "(:ip IS NULL OR LOWER(attacker_ip) LIKE LOWER(CONCAT('%', :ip, '%'))) AND " +
            "(:status IS NULL OR status_code = :status) AND " +
            "(:httpMethod IS NULL OR LOWER(http_method) = LOWER(:httpMethod)) AND " +
            "(CAST(:dateFrom AS timestamp) IS NULL OR timestamp >= :dateFrom) AND " +
            "(CAST(:dateTo AS timestamp) IS NULL OR timestamp <= :dateTo)",
    countQuery = "SELECT COUNT(*) FROM attacks WHERE " +
            "(:endpoint IS NULL OR LOWER(endpoint) LIKE LOWER(CONCAT('%', :endpoint, '%'))) AND " +
            "(:ip IS NULL OR LOWER(attacker_ip) LIKE LOWER(CONCAT('%', :ip, '%'))) AND " +
            "(:status IS NULL OR status_code = :status) AND " +
            "(:httpMethod IS NULL OR LOWER(http_method) = LOWER(:httpMethod)) AND " +
            "(CAST(:dateFrom AS timestamp) IS NULL OR timestamp >= :dateFrom) AND " +
            "(CAST(:dateTo AS timestamp) IS NULL OR timestamp <= :dateTo)",
    nativeQuery = true)
    Page<Attack> search(@Param("endpoint") String endpoint,
                        @Param("ip") String ip,
                        @Param("status") Integer status,
                        @Param("httpMethod") String httpMethod,
                        @Param("dateFrom") LocalDateTime dateFrom,
                        @Param("dateTo") LocalDateTime dateTo,
                        Pageable pageable);

}
