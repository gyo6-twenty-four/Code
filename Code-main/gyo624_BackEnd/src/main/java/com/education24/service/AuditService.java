package com.education24.service;

import com.education24.domain.AuditLog;
import com.education24.domain.User;
import com.education24.repository.AuditLogRepository;
import com.education24.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class AuditService {
    private final AuditLogRepository logs;
    private final UserRepository users;

    public AuditService(AuditLogRepository logs, UserRepository users) {
        this.logs = logs;
        this.users = users;
    }

    public void record(User actor, String eventType, String targetType, Long targetId, String safeDetails) {
        logs.save(new AuditLog(actor, eventType, targetType, targetId, safeDetails));
    }

    public void recordCurrent(String eventType, String targetType, Long targetId, String safeDetails) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User actor = authentication == null ? null : users.findByEmail(User.normalizeEmail(authentication.getName())).orElse(null);
        record(actor, eventType, targetType, targetId, safeDetails);
    }
}
