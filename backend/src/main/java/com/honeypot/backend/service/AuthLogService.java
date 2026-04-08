package com.honeypot.backend.service;

import com.honeypot.backend.model.AuthLog;
import com.honeypot.backend.repository.AuthLogRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuthLogService {

    private final AuthLogRepository authLogRepository;

    public AuthLogService(AuthLogRepository authLogRepository) {
        this.authLogRepository = authLogRepository;
    }

    public List<AuthLog> getAllAuthLogs() {
        return authLogRepository.findAll();
    }

    public List<AuthLog> getByUsername(String username) {
        return authLogRepository.findByUsername(username);
    }

    public List<AuthLog> getBySourceIp(String sourceIp) {
        return authLogRepository.findBySourceIp(sourceIp);
    }

    public List<AuthLog> getByStatus(String status) {
        return authLogRepository.findByStatus(status);
    }

    public List<AuthLog> search(String username, String ip, String status) {
        List<AuthLog> authLogs = authLogRepository.findAll();

        if (username != null) {
            authLogs = authLogs.stream()
                    .filter(a -> username.equals(a.getUsername()))
                    .toList();
        }

        if (ip != null) {
            authLogs = authLogs.stream()
                    .filter(a -> ip.equals(a.getSourceIp()))
                    .toList();
        }

        if (status != null) {
            authLogs = authLogs.stream()
                    .filter(a -> status.equals(a.getStatus()))
                    .toList();
        }

        return authLogs;
    }
}
