package com.education24.security;

import com.education24.config.JwtProperties;
import com.education24.domain.User;
import com.education24.exception.BusinessException;
import com.education24.exception.ErrorCode;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenProvider {
    private final JwtProperties properties;
    private final SecretKey key;

    public JwtTokenProvider(JwtProperties properties) {
        this.properties = properties;
        this.key = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
    }

    public IssuedToken issueAccess(User user) {
        return issue(user, "ACCESS", properties.accessTokenTtl());
    }

    public IssuedToken issueRefresh(User user) {
        return issue(user, "REFRESH", properties.refreshTokenTtl());
    }

    private IssuedToken issue(User user, String type, Duration ttl) {
        Instant now = Instant.now();
        Instant expiry = now.plus(ttl);
        String token = Jwts.builder()
                .subject(user.getId().toString())
                .claim("role", user.getRole().name())
                .claim("type", type)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(key)
                .compact();
        return new IssuedToken(token, expiry);
    }

    public Claims parse(String token, String expectedType) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build()
                    .parseSignedClaims(token).getPayload();
            if (!expectedType.equals(claims.get("type", String.class))) {
                throw new BusinessException(ErrorCode.INVALID_TOKEN);
            }
            return claims;
        } catch (ExpiredJwtException exception) {
            throw new BusinessException(ErrorCode.EXPIRED_TOKEN);
        } catch (JwtException | IllegalArgumentException exception) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN);
        }
    }

    public record IssuedToken(String value, Instant expiresAt) {
    }
}
