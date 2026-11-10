package com.education24.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name = "observation_revisions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"observation_id", "revision_number"}))
public class ObservationRevision {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "observation_id") private Observation observation;
    @Column(name = "revision_number", nullable = false) private int revisionNumber;
    @Column(nullable = false, columnDefinition = "TEXT") private String content;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "subject_id") private Subject subject;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "activity_id") private Activity activity;
    @Column(name = "observed_at", nullable = false) private Instant observedAt;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "changed_by") private User changedBy;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    protected ObservationRevision() {}
    public ObservationRevision(Observation observation, int revisionNumber, String content,
            Subject subject, Activity activity, Instant observedAt, User changedBy) {
        this.observation = observation; this.revisionNumber = revisionNumber; this.content = content;
        this.subject = subject; this.activity = activity; this.observedAt = observedAt; this.changedBy = changedBy;
    }
    @PrePersist void createTimestamp() { createdAt = Instant.now(); }
    public Long getId() { return id; } public int getRevisionNumber() { return revisionNumber; }
}
