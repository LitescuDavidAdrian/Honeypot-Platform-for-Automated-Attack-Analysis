package com.honeypot.backend.service;

import com.honeypot.backend.model.CommandLog;
import com.honeypot.backend.repository.CommandLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class CommandLogService {

    private final CommandLogRepository commandLogRepository;

    public CommandLogService(CommandLogRepository commandLogRepository) {
        this.commandLogRepository = commandLogRepository;
    }

    public Page<CommandLog> getAllCommandLogs(Pageable pageable) {
        return commandLogRepository.findAll(pageable);
    }

    public Page<CommandLog> search(String command, LocalDateTime dateFrom,
                                   LocalDateTime dateTo, Pageable pageable) {
        return commandLogRepository.search(command, dateFrom, dateTo, pageable);
    }
}
