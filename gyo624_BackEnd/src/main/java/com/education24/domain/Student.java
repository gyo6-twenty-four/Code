package com.education24.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "students")
public class Student {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "pseudonym_id", nullable = false, unique = true, length = 100)
    private String pseudonymId;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Student() {}
    public Student(String pseudonymId) { this.pseudonymId = pseudonymId; }
    @PrePersist void createTimestamps() { createdAt = updatedAt = Instant.now(); }
    @PreUpdate void updateTimestamp() { updatedAt = Instant.now(); }
    public void update(String pseudonymId) { this.pseudonymId = pseudonymId; }
    public Long getId() { return id; }
    public String getPseudonymId() { return pseudonymId; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
