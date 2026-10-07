package com.education24.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity @Table(name = "observations")
public class Observation {
    public enum Status { DRAFT, IN_REVIEW, APPROVED, REJECTED }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "student_id") private Student student;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "teacher_id") private User teacher;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "subject_id") private Subject subject;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "activity_id") private Activity activity;
    @Column(nullable = false, columnDefinition = "TEXT") private String content;
    @Column(name = "observed_at", nullable = false) private Instant observedAt;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Status status = Status.DRAFT;
    @Version @Column(nullable = false) private long version;
    @Column(name = "rejection_reason", length = 1000) private String rejectionReason;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "observation_tags", joinColumns = @JoinColumn(name = "observation_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private Set<Tag> tags = new LinkedHashSet<>();

    protected Observation() {}
    public Observation(Student student, User teacher, Subject subject, Activity activity,
            String content, Instant observedAt, Set<Tag> tags) {
        this.student = student; this.teacher = teacher; this.subject = subject; this.activity = activity;
        this.content = content; this.observedAt = observedAt; this.tags = new LinkedHashSet<>(tags);
    }
    @PrePersist void createTimestamps() { createdAt = updatedAt = Instant.now(); }
    @PreUpdate void updateTimestamp() { updatedAt = Instant.now(); }
    public void update(Student student, Subject subject, Activity activity, String content, Instant observedAt, Set<Tag> tags) {
        this.student = student; this.subject = subject; this.activity = activity; this.content = content;
        this.observedAt = observedAt; this.tags.clear(); this.tags.addAll(tags); this.rejectionReason = null;
    }
    public void submit() { status = Status.IN_REVIEW; rejectionReason = null; }
    public void approve() { status = Status.APPROVED; rejectionReason = null; }
    public void reject(String reason) { status = Status.REJECTED; rejectionReason = reason; }
    public void revoke() { status = Status.REJECTED; rejectionReason = null; }
    public Long getId() { return id; } public Student getStudent() { return student; }
    public User getTeacher() { return teacher; } public Subject getSubject() { return subject; }
    public Activity getActivity() { return activity; } public String getContent() { return content; }
    public Instant getObservedAt() { return observedAt; } public Status getStatus() { return status; }
    public long getVersion() { return version; } public String getRejectionReason() { return rejectionReason; }
    public Instant getCreatedAt() { return createdAt; } public Instant getUpdatedAt() { return updatedAt; }
    public Set<Tag> getTags() { return Set.copyOf(tags); }
}
