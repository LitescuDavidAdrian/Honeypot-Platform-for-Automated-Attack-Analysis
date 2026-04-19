package com.honeypot.backend.service;

import com.honeypot.backend.model.AuthLog;
import com.honeypot.backend.repository.AuthLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuthLogService {

    private final AuthLogRepository authLogRepository;

    public AuthLogService(AuthLogRepository authLogRepository) {
        this.authLogRepository = authLogRepository;
    }

    public Page<AuthLog> getAllAuthLogs(Pageable pageable) {
        return authLogRepository.findAll(pageable);
    }

    public List<AuthLog> search(String username, String ip, String status) {
        return authLogRepository.search(username, ip, status);
    }
}
