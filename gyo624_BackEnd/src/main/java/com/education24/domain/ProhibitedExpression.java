package com.education24.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "prohibited_expressions")
public class ProhibitedExpression {
    public enum MatchType { EXACT, CONTAINS, REGEX }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false,unique=true,length=500) private String expression;
    @Enumerated(EnumType.STRING) @Column(name="match_type",nullable=false,length=30) private MatchType matchType;
    @Column(length=1000) private String description;
    @Column(nullable=false) private boolean active=true;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="created_by") private User createdBy;
    @Column(name="created_at",nullable=false,updatable=false) private Instant createdAt;
    @Column(name="updated_at",nullable=false) private Instant updatedAt;
    protected ProhibitedExpression(){}
    public ProhibitedExpression(String expression,MatchType matchType,String description,boolean active,User creator){
        this.expression=expression;this.matchType=matchType;this.description=description;this.active=active;createdBy=creator;
    }
    @PrePersist void create(){createdAt=updatedAt=Instant.now();} @PreUpdate void updateTimestamp(){updatedAt=Instant.now();}
    public void update(String expression,MatchType type,String description,boolean active){
        this.expression=expression;matchType=type;this.description=description;this.active=active;
    }
    public Long getId(){return id;} public String getExpression(){return expression;} public MatchType getMatchType(){return matchType;}
    public String getDescription(){return description;} public boolean isActive(){return active;}
    public Long getCreatedById(){return createdBy.getId();} public Instant getCreatedAt(){return createdAt;} public Instant getUpdatedAt(){return updatedAt;}
}
