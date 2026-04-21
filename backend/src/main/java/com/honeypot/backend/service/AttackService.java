package com.honeypot.backend.service;

import com.honeypot.backend.model.Attack;
import com.honeypot.backend.repository.AttackRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AttackService {

    private final AttackRepository attackRepository;

    public AttackService(AttackRepository attackRepository) {
        this.attackRepository = attackRepository;
    }

    public Page<Attack> getAllAttacks(Pageable pageable) {
        return attackRepository.findAll(pageable);
    }

    public Page<Attack> search(String endpoint, String ip, Integer status, Pageable pageable) {
        return attackRepository.search(endpoint, ip, status, pageable);
    }
}
