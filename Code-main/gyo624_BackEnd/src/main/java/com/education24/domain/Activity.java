package com.education24.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name = "activities", uniqueConstraints = @UniqueConstraint(columnNames = {"subject_id", "name"}))
public class Activity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "subject_id") private Subject subject;
    @Column(nullable = false, length = 150) private String name;
    @Column(nullable = false) private boolean active = true;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    protected Activity() {}
    public Activity(Subject subject, String name) { this.subject = subject; this.name = name; }
    @PrePersist void createTimestamps() { createdAt = updatedAt = Instant.now(); }
    @PreUpdate void updateTimestamp() { updatedAt = Instant.now(); }
    public void update(Subject subject, String name, boolean active) {
        this.subject = subject; this.name = name; this.active = active;
    }
    public Long getId() { return id; } public Subject getSubject() { return subject; }
    public String getName() { return name; } public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; } public Instant getUpdatedAt() { return updatedAt; }
}
