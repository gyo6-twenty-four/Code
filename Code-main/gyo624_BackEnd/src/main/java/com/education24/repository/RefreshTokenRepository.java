package com.education24.repository;

import com.education24.domain.RefreshToken;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("update RefreshToken t set t.revokedAt = :revokedAt "
            + "where t.user.id = :userId and t.revokedAt is null")
    int revokeAllByUserId(
            @Param("userId") Long userId, @Param("revokedAt") Instant revokedAt);
}
