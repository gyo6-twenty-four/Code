package com.education24.service;

import com.education24.exception.BusinessException;
import com.education24.exception.ErrorCode;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class LoginAttemptService {
    static final int MAX_FAILURES = 10;
    static final Duration WINDOW = Duration.ofMinutes(10);
    private static final int MAX_TRACKED_ACCOUNTS = 10_000;

    private final Map<String, Deque<Instant>> failures = new LinkedHashMap<>(16, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, Deque<Instant>> eldest) {
            return size() > MAX_TRACKED_ACCOUNTS;
        }
    };

    public synchronized void assertAllowed(String normalizedEmail) {
        Deque<Instant> recent = recent(normalizedEmail, Instant.now());
        if (recent.size() >= MAX_FAILURES) {
            throw new BusinessException(ErrorCode.TOO_MANY_LOGIN_ATTEMPTS);
        }
    }

    public synchronized void recordFailure(String normalizedEmail) {
        recent(normalizedEmail, Instant.now()).addLast(Instant.now());
    }

    public synchronized void recordSuccess(String normalizedEmail) {
        failures.remove(normalizedEmail);
    }

    private Deque<Instant> recent(String normalizedEmail, Instant now) {
        Deque<Instant> recent = failures.computeIfAbsent(normalizedEmail, ignored -> new ArrayDeque<>());
        while (!recent.isEmpty() && !recent.peekFirst().plus(WINDOW).isAfter(now)) {
            recent.removeFirst();
        }
        return recent;
    }
}
