package com.education24.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Locale;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "school_code", nullable = false, length = 20)
    private String schoolCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected User() {
    }

    public User(String email, String passwordHash, String name, Role role) {
        this(email, passwordHash, name, role, "DEFAULT");
    }

    public User(String email, String passwordHash, String name, Role role, String schoolCode) {
        this.email = normalizeEmail(email);
        this.passwordHash = passwordHash;
        this.name = name;
        this.role = role;
        this.schoolCode = normalizeSchoolCode(schoolCode);
        this.status = UserStatus.ACTIVE;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public void update(String name, Role role, UserStatus status, String passwordHash) {
        this.name = name;
        this.role = role;
        this.status = status;
        if (passwordHash != null) {
            this.passwordHash = passwordHash;
        }
    }

    public void delete() {
        status = UserStatus.DELETED;
    }

    public boolean isActive() {
        return status == UserStatus.ACTIVE;
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getName() { return name; }
    public String getSchoolCode() { return schoolCode; }
    public Role getRole() { return role; }
    public UserStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public static String normalizeSchoolCode(String schoolCode) {
        String normalized = schoolCode == null ? "" : schoolCode.trim().toUpperCase(Locale.ROOT);
        if (!normalized.matches("[A-Z0-9]{3,20}")) {
            throw new IllegalArgumentException("학교 코드는 영문 대문자와 숫자 3~20자로 입력해야 합니다.");
        }
        return normalized;
    }

    public enum Role { TEACHER, ADMIN }
    public enum UserStatus { ACTIVE, INACTIVE, LOCKED, DELETED }
}
