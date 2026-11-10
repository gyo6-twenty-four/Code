package com.education24.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "validation_policies")
public class ValidationPolicy {
    public enum PolicyType { CHARACTER_LIMIT }
    public enum TargetType { DRAFT, SENTENCE }
    public enum Severity { ERROR, WARNING }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Enumerated(EnumType.STRING) @Column(name = "policy_type", nullable = false, length = 50) private PolicyType policyType;
    @Enumerated(EnumType.STRING) @Column(name = "target_type", nullable = false, length = 50) private TargetType targetType;
    @Column(name = "policy_value", nullable = false, length = 1000) private String policyValue;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Severity severity;
    @Column(nullable = false) private boolean active = true;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "created_by") private User createdBy;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    protected ValidationPolicy() {}
    public ValidationPolicy(PolicyType type, TargetType target, String value, Severity severity, boolean active, User creator) {
        policyType=type; targetType=target; policyValue=value; this.severity=severity; this.active=active; createdBy=creator;
    }
    @PrePersist void create() { createdAt=updatedAt=Instant.now(); }
    @PreUpdate void updateTimestamp() { updatedAt=Instant.now(); }
    public void update(PolicyType type, TargetType target, String value, Severity severity, boolean active) {
        policyType=type; targetType=target; policyValue=value; this.severity=severity; this.active=active;
    }
    public Long getId(){return id;} public PolicyType getPolicyType(){return policyType;}
    public TargetType getTargetType(){return targetType;} public String getPolicyValue(){return policyValue;}
    public Severity getSeverity(){return severity;} public boolean isActive(){return active;}
    public Long getCreatedById(){return createdBy.getId();} public Instant getCreatedAt(){return createdAt;}
    public Instant getUpdatedAt(){return updatedAt;}
}
