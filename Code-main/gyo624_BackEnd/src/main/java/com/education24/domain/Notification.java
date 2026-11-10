package com.education24.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name="notifications")
public class Notification {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="user_id") private User user;
    @Column(nullable=false,length=100) private String type;
    @Column(nullable=false,length=1000) private String message;
    @Column(name="read_at") private Instant readAt;
    @Column(name="created_at",nullable=false,updatable=false) private Instant createdAt;
    protected Notification(){}
    public Notification(User user,String type,String message){this.user=user;this.type=type;this.message=message;}
    @PrePersist void create(){createdAt=Instant.now();}
    public Long getId(){return id;} public User getUser(){return user;}
}
