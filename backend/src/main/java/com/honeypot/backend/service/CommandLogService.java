package com.honeypot.backend.service;

import com.honeypot.backend.model.CommandLog;
import com.honeypot.backend.repository.CommandLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CommandLogService {

    private final CommandLogRepository commandLogRepository;

    public CommandLogService(CommandLogRepository commandLogRepository) {
        this.commandLogRepository = commandLogRepository;
    }

    public Page<CommandLog> getALlCommandLogs(Pageable pageable) {
        return commandLogRepository.findAll(pageable);
    }

    public List<CommandLog> getByCommand(String command) {
        return commandLogRepository.findByCommand(command);
    }

    public List<CommandLog> search(String command) {
        List<CommandLog> commandLogs = commandLogRepository.findAll();

        if (command != null) {
            commandLogs = commandLogs.stream()
                    .filter(c -> c.getCommand() != null &&
                            c.getCommand().contains(command))
                    .toList();
        }

        return commandLogs;
    }
}
