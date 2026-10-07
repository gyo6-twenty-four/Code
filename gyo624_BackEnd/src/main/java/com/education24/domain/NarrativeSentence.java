package com.education24.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "narrative_sentences", uniqueConstraints = @UniqueConstraint(columnNames = {"draft_id", "sequence_number"}))
public class NarrativeSentence {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "draft_id")
    private NarrativeDraft draft;
    @Column(name = "sequence_number", nullable = false)
    private int sequenceNumber;
    @Column(name = "original_content", nullable = false, columnDefinition = "TEXT")
    private String originalContent;
    @Column(name = "edited_content", columnDefinition = "TEXT")
    private String editedContent;
    @Column(name = "edited_by_teacher", nullable = false)
    private boolean editedByTeacher;
    @Column(name = "connection_confirmed", nullable = false)
    private boolean connectionConfirmed;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    @OneToMany(mappedBy = "sentence", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<SentenceEvidence> evidences = new LinkedHashSet<>();

    protected NarrativeSentence() {}
    public NarrativeSentence(NarrativeDraft draft, int sequenceNumber, String content) {
        this.draft = draft; this.sequenceNumber = sequenceNumber; this.originalContent = content;
    }
    @PrePersist void onCreate() { createdAt = updatedAt = Instant.now(); }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }
    public void edit(String content) {
        editedContent = content; editedByTeacher = true; connectionConfirmed = false;
        evidences.forEach(SentenceEvidence::unconfirm);
        draft.needsRevalidation();
    }
    public void replaceEvidences(Set<EvidenceSnapshot> replacements, boolean suggested) {
        evidences.clear();
        replacements.forEach(e -> evidences.add(new SentenceEvidence(this, e, suggested)));
        connectionConfirmed = false;
        draft.needsRevalidation();
    }
    public void confirmEvidences() {
        evidences.forEach(SentenceEvidence::confirm);
        connectionConfirmed = !evidences.isEmpty();
        draft.needsRevalidation();
    }
    public String content() { return editedContent == null ? originalContent : editedContent; }
    public Long getId() { return id; }
    public NarrativeDraft getDraft() { return draft; }
    public int getSequenceNumber() { return sequenceNumber; }
    public String getOriginalContent() { return originalContent; }
    public String getEditedContent() { return editedContent; }
    public boolean isEditedByTeacher() { return editedByTeacher; }
    public boolean isConnectionConfirmed() { return connectionConfirmed; }
    public Set<SentenceEvidence> getEvidences() { return Set.copyOf(evidences); }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
