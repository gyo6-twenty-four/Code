package com.education24.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name="audit_logs")
public class AuditLog {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="actor_id") private User actor;
    @Column(name="event_type",nullable=false,length=100) private String eventType;
    @Column(name="target_type",length=100) private String targetType;
    @Column(name="target_id") private Long targetId;
    @Column(columnDefinition="TEXT") private String details;
    @Column(name="created_at",nullable=false,updatable=false) private Instant createdAt;
    protected AuditLog(){}
    public AuditLog(User actor,String eventType,String targetType,Long targetId,String details){
        this.actor=actor;this.eventType=eventType;this.targetType=targetType;this.targetId=targetId;this.details=details;
    }
    @PrePersist void create(){createdAt=Instant.now();}
}
