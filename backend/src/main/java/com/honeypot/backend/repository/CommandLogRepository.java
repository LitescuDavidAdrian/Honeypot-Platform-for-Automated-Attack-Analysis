package com.honeypot.backend.repository;

import com.honeypot.backend.model.CommandLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommandLogRepository extends JpaRepository<CommandLog, Long> {

    @Query (value = "SELECT * FROM command_logs WHERE " +
    "(:command IS NULL OR LOWER(command) LIKE LOWER(CONCAT('%', :command, '%')))",
    nativeQuery = true)
    List<CommandLog> search(@Param("command") String command);
}
