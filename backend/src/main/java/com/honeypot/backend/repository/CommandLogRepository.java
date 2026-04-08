package com.honeypot.backend.repository;

import com.honeypot.backend.model.CommandLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommandLogRepository extends JpaRepository<CommandLog, Long> {

    List<CommandLog> findByCommand(String command);
}
