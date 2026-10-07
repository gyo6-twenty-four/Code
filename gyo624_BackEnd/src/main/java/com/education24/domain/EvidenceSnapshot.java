package com.education24.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name = "evidence_snapshots")
public class EvidenceSnapshot {
    public enum Status { ACTIVE, REVOKED }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "observation_id") private Observation observation;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "observation_revision_id") private ObservationRevision revision;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "student_id") private Student student;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "subject_id") private Subject subject;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "activity_id") private Activity activity;
    @Column(nullable = false, columnDefinition = "TEXT") private String content;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "approved_by") private User approvedBy;
    @Column(name = "approved_at", nullable = false) private Instant approvedAt;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Status status;
    protected EvidenceSnapshot() {}
    public EvidenceSnapshot(Observation observation, ObservationRevision revision, User approver) {
        this.observation = observation; this.revision = revision; this.student = observation.getStudent();
        this.subject = observation.getSubject(); this.activity = observation.getActivity();
        this.content = observation.getContent(); this.approvedBy = approver; this.approvedAt = Instant.now();
        this.status = Status.ACTIVE;
    }
    public void revoke() { status = Status.REVOKED; }
    public Long getId() { return id; } public Observation getObservation() { return observation; }
    public Student getStudent() { return student; } public Subject getSubject() { return subject; }
    public Activity getActivity() { return activity; } public String getContent() { return content; }
    public User getApprovedBy() { return approvedBy; } public Instant getApprovedAt() { return approvedAt; }
    public Status getStatus() { return status; }
}
