package com.honeypot.backend.controller;

import com.honeypot.backend.model.CommandLog;
import com.honeypot.backend.service.CommandLogService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/command-logs")
@CrossOrigin
public class CommandLogController {

    private final CommandLogService commandLogService;

    public CommandLogController(CommandLogService commandLogService) {
        this.commandLogService = commandLogService;
    }

    @GetMapping
    public List<CommandLog> getAll() {
        return commandLogService.getALlCommandLogs();
    }

    @GetMapping("/search")
    public List<CommandLog> search(
            @RequestParam(required = false) String command
    ) {
        return commandLogService.search(command);
    }
}
