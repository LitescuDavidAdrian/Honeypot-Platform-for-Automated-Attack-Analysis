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

    public List<Attack> getByIp(String ip) {
        return attackRepository.findByAttackerIp(ip);
    }

    public List<Attack> getByStatusCode(Integer statusCode) {
        return attackRepository.findByStatusCode(statusCode);
    }

    public List<Attack> getByEndpoint(String endpoint) {
        return attackRepository.findByEndpoint(endpoint);
    }

    public List<Attack> search(String endpoint, String ip, Integer status) {
        List<Attack> attacks = attackRepository.findAll();

        if (endpoint != null) {
            attacks = attacks.stream()
                    .filter(a -> endpoint.equals(a.getEndpoint()))
                    .toList();
        }

        if (ip != null) {
            attacks = attacks.stream()
                    .filter(a -> ip.equals(a.getAttackerIp()))
                    .toList();
        }

        if(status != null) {
            attacks = attacks.stream()
                    .filter(a -> status.equals(a.getStatusCode()))
                    .toList();
        }

        return attacks;
    }
}
