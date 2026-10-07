package com.education24.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "student_identities")
public class StudentIdentity {
    @Id
    @Column(name = "student_id")
    private Long studentId;
    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id")
    private Student student;
    @Column(name = "real_name", nullable = false, length = 100)
    private String realName;
    @Column(name = "internal_identifier", length = 100)
    private String internalIdentifier;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected StudentIdentity() {}
    public StudentIdentity(Student student, String realName, String internalIdentifier) {
        this.student = student; this.realName = realName; this.internalIdentifier = internalIdentifier;
    }
    @PrePersist void createTimestamps() { createdAt = updatedAt = Instant.now(); }
    @PreUpdate void updateTimestamp() { updatedAt = Instant.now(); }
    public void update(String realName, String internalIdentifier) {
        this.realName = realName; this.internalIdentifier = internalIdentifier;
    }
    public Long getStudentId() { return studentId; }
    public String getRealName() { return realName; }
    public String getInternalIdentifier() { return internalIdentifier; }
}
