package com.education24.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "narrative_drafts")
public class NarrativeDraft {
    public enum Status { GENERATING, DRAFT, VALID, VALIDATION_FAILED, NEEDS_REVALIDATION, FINALIZED, GENERATION_FAILED }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "student_id")
    private Student student;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "teacher_id")
    private User teacher;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30)
    private Status status;
    @Column(name = "validation_status", length = 30)
    private String validationStatus;
    @Column(name = "llm_provider", length = 100)
    private String llmProvider;
    @Column(name = "llm_model", length = 100)
    private String llmModel;
    @Column(name = "prompt_version", length = 50)
    private String promptVersion;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    @Column(name = "finalized_at")
    private Instant finalizedAt;
    @OneToMany(mappedBy = "draft", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequenceNumber asc")
    private List<NarrativeSentence> sentences = new ArrayList<>();

    protected NarrativeDraft() {}
    public NarrativeDraft(Student student, User teacher) {
        this.student = student;
        this.teacher = teacher;
        this.status = Status.GENERATING;
    }
    @PrePersist void onCreate() { createdAt = updatedAt = Instant.now(); }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }
    public void addSentence(NarrativeSentence sentence) { sentences.add(sentence); }
    public void generated(String provider, String model, String version) {
        llmProvider = provider;
        llmModel = model;
        promptVersion = version;
        status = Status.DRAFT;
    }
    public void generationFailed() { status = Status.GENERATION_FAILED; }
    public void needsRevalidation() { if (status != Status.FINALIZED) status = Status.NEEDS_REVALIDATION; }
    public void validated(boolean passed) {
        status = passed ? Status.VALID : Status.VALIDATION_FAILED;
        validationStatus = passed ? "PASSED" : "FAILED";
    }
    public void finalizeDraft() { status = Status.FINALIZED; finalizedAt = Instant.now(); }
    public Long getId() { return id; }
    public Student getStudent() { return student; }
    public User getTeacher() { return teacher; }
    public Status getStatus() { return status; }
    public String getValidationStatus() { return validationStatus; }
    public String getLlmProvider() { return llmProvider; }
    public String getLlmModel() { return llmModel; }
    public String getPromptVersion() { return promptVersion; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getFinalizedAt() { return finalizedAt; }
    public List<NarrativeSentence> getSentences() { return List.copyOf(sentences); }
}
