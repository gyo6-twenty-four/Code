package com.education24.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name="validation_results")
public class ValidationResult {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="draft_id") private NarrativeDraft draft;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="sentence_id") private NarrativeSentence sentence;
    @Column(name="rule_type",nullable=false,length=50) private String ruleType;
    @Column(nullable=false) private boolean passed;
    @Column(length=1000) private String message;
    @Column(name="created_at",nullable=false,updatable=false) private Instant createdAt;
    protected ValidationResult(){}
    public ValidationResult(NarrativeDraft draft,NarrativeSentence sentence,String ruleType,boolean passed,String message){
        this.draft=draft;this.sentence=sentence;this.ruleType=ruleType;this.passed=passed;this.message=message;
    }
    @PrePersist void create(){createdAt=Instant.now();}
    public Long getId(){return id;} public NarrativeDraft getDraft(){return draft;} public NarrativeSentence getSentence(){return sentence;}
    public String getRuleType(){return ruleType;} public boolean isPassed(){return passed;} public String getMessage(){return message;}
    public Instant getCreatedAt(){return createdAt;}
}
