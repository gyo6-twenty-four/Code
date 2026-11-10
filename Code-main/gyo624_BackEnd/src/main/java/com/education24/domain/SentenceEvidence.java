package com.education24.domain;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "sentence_evidences")
public class SentenceEvidence {
    @EmbeddedId
    private Id id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @MapsId("sentenceId") @JoinColumn(name = "sentence_id")
    private NarrativeSentence sentence;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @MapsId("evidenceId") @JoinColumn(name = "evidence_id")
    private EvidenceSnapshot evidence;
    @Column(name = "suggested_by_llm", nullable = false)
    private boolean suggestedByLlm;
    @Column(name = "confirmed_by_teacher", nullable = false)
    private boolean confirmedByTeacher;
    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    protected SentenceEvidence() {}
    public SentenceEvidence(NarrativeSentence sentence, EvidenceSnapshot evidence, boolean suggestedByLlm) {
        this.sentence = sentence; this.evidence = evidence; this.suggestedByLlm = suggestedByLlm;
        this.id = new Id(sentence.getId(), evidence.getId());
    }
    public void confirm() { confirmedByTeacher = true; confirmedAt = Instant.now(); }
    public void unconfirm() { confirmedByTeacher = false; confirmedAt = null; }
    public NarrativeSentence getSentence() { return sentence; }
    public EvidenceSnapshot getEvidence() { return evidence; }
    public boolean isSuggestedByLlm() { return suggestedByLlm; }
    public boolean isConfirmedByTeacher() { return confirmedByTeacher; }
    public Instant getConfirmedAt() { return confirmedAt; }

    @Embeddable
    public static class Id implements Serializable {
        @Column(name = "sentence_id") private Long sentenceId;
        @Column(name = "evidence_id") private Long evidenceId;
        protected Id() {}
        public Id(Long sentenceId, Long evidenceId) { this.sentenceId = sentenceId; this.evidenceId = evidenceId; }
        @Override public boolean equals(Object o) {
            return o instanceof Id other && Objects.equals(sentenceId, other.sentenceId) && Objects.equals(evidenceId, other.evidenceId);
        }
        @Override public int hashCode() { return Objects.hash(sentenceId, evidenceId); }
    }
}
