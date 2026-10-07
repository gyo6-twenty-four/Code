package com.education24.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name = "tags")
public class Tag {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 100) private String name;
    @Column(nullable = false) private boolean active = true;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    protected Tag() {}
    public Tag(String name) { this.name = name; }
    @PrePersist void createTimestamps() { createdAt = updatedAt = Instant.now(); }
    @PreUpdate void updateTimestamp() { updatedAt = Instant.now(); }
    public void update(String name, boolean active) { this.name = name; this.active = active; }
    public Long getId() { return id; } public String getName() { return name; }
    public boolean isActive() { return active; } public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
