package com.honeypot.backend.controller;

import com.honeypot.backend.model.CommandLog;
import com.honeypot.backend.service.CommandLogService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/command-logs")
public class CommandLogController {

    private final CommandLogService commandLogService;

    public CommandLogController(CommandLogService commandLogService) {
        this.commandLogService = commandLogService;
    }

    @GetMapping
    public Page<CommandLog> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "timestamp") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        Sort sort = direction.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);
        return commandLogService.getALlCommandLogs(pageable);
    }

    @GetMapping("/search")
    public List<CommandLog> search(
            @RequestParam(required = false) String command
    ) {
        return commandLogService.search(command);
    }
}
