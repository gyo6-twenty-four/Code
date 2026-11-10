package com.education24.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "students", uniqueConstraints =
        @UniqueConstraint(name = "uq_students_school_pseudonym", columnNames = {"school_code", "pseudonym_id"}))
public class Student {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "pseudonym_id", nullable = false, length = 100)
    private String pseudonymId;
    @Column(name = "school_code", nullable = false, length = 20)
    private String schoolCode;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Student() {}
    public Student(String pseudonymId) { this(pseudonymId, "DEFAULT"); }
    public Student(String pseudonymId, String schoolCode) {
        this.pseudonymId = pseudonymId;
        this.schoolCode = User.normalizeSchoolCode(schoolCode);
    }
    @PrePersist void createTimestamps() { createdAt = updatedAt = Instant.now(); }
    @PreUpdate void updateTimestamp() { updatedAt = Instant.now(); }
    public void update(String pseudonymId) { this.pseudonymId = pseudonymId; }
    public Long getId() { return id; }
    public String getPseudonymId() { return pseudonymId; }
    public String getSchoolCode() { return schoolCode; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
