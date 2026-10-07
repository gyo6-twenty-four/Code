package com.education24.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name = "observation_approval_histories")
public class ObservationApprovalHistory {
    public enum Action { SUBMITTED, APPROVED, REJECTED, REVOKED }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "observation_id") private Observation observation;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Action action;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "actor_id") private User actor;
    @Column(length = 1000) private String reason;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    protected ObservationApprovalHistory() {}
    public ObservationApprovalHistory(Observation observation, Action action, User actor, String reason) {
        this.observation = observation; this.action = action; this.actor = actor; this.reason = reason;
    }
    @PrePersist void createTimestamp() { createdAt = Instant.now(); }
    public Long getId() { return id; } public Action getAction() { return action; }
}
