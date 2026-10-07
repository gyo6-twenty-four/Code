package com.education24.service;

import com.education24.domain.RefreshToken;
import com.education24.domain.User;
import com.education24.dto.response.MeResponse;
import com.education24.dto.response.TokenResponse;
import com.education24.exception.BusinessException;
import com.education24.exception.ErrorCode;
import com.education24.repository.RefreshTokenRepository;
import com.education24.repository.UserRepository;
import com.education24.security.JwtTokenProvider;
import io.jsonwebtoken.Claims;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AuthService {
    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtTokenProvider tokenProvider;

    public AuthService(AuthenticationManager authenticationManager, UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository, JwtTokenProvider tokenProvider) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.tokenProvider = tokenProvider;
    }

    @Transactional
    public TokenResponse login(String email, String password) {
        String normalized = User.normalizeEmail(email);
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(normalized, password));
        } catch (AuthenticationException exception) {
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }
        return issuePair(requireByEmail(normalized));
    }

    @Transactional
    public TokenResponse refresh(String rawToken) {
        Claims claims = tokenProvider.parse(rawToken, "REFRESH");
        RefreshToken stored = refreshTokenRepository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_TOKEN));
        User user = stored.getUser();
        if (!stored.isUsable(Instant.now())
                || !user.getId().toString().equals(claims.getSubject())) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN);
        }
        if (!user.isActive()) {
            throw new BusinessException(ErrorCode.USER_INACTIVE);
        }

        JwtTokenProvider.IssuedToken access = tokenProvider.issueAccess(user);
        JwtTokenProvider.IssuedToken refresh = tokenProvider.issueRefresh(user);
        String replacementHash = hash(refresh.value());
        stored.revoke(replacementHash);
        refreshTokenRepository.save(
                new RefreshToken(user, replacementHash, refresh.expiresAt()));
        return response(access, refresh);
    }

    @Transactional
    public void logout(String rawToken) {
        tokenProvider.parse(rawToken, "REFRESH");
        refreshTokenRepository.findByTokenHash(hash(rawToken))
                .filter(token -> token.isUsable(Instant.now()))
                .ifPresent(token -> token.revoke(null));
    }

    public MeResponse me(String email) {
        return MeResponse.from(requireByEmail(User.normalizeEmail(email)));
    }

    private TokenResponse issuePair(User user) {
        JwtTokenProvider.IssuedToken access = tokenProvider.issueAccess(user);
        JwtTokenProvider.IssuedToken refresh = tokenProvider.issueRefresh(user);
        refreshTokenRepository.save(
                new RefreshToken(user, hash(refresh.value()), refresh.expiresAt()));
        return response(access, refresh);
    }

    private TokenResponse response(JwtTokenProvider.IssuedToken access,
            JwtTokenProvider.IssuedToken refresh) {
        return new TokenResponse("Bearer", access.value(), access.expiresAt(),
                refresh.value(), refresh.expiresAt());
    }

    private User requireByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }

    static String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
