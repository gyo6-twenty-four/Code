package com.education24.service;

import com.education24.domain.User;
import com.education24.dto.request.UserCreateRequest;
import com.education24.dto.request.UserUpdateRequest;
import com.education24.dto.response.PageResponse;
import com.education24.dto.response.UserResponse;
import com.education24.exception.BusinessException;
import com.education24.exception.ErrorCode;
import com.education24.repository.UserRepository;
import com.education24.support.Pageables;
import java.util.Set;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class UserService {
    private static final Set<String> SORTABLE = Set.of(
            "id", "email", "name", "role", "status", "createdAt", "updatedAt");
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserResponse create(UserCreateRequest request) {
        String email = User.normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }
        User user = new User(email, passwordEncoder.encode(request.password()),
                request.name(), request.role(), actor().getSchoolCode());
        return UserResponse.from(userRepository.save(user));
    }

    public PageResponse<UserResponse> findAll(Pageable pageable) {
        User actor = actor();
        return PageResponse.from(userRepository.findAllBySchoolCode(actor.getSchoolCode(),
                Pageables.sanitize(pageable, SORTABLE))
                .map(UserResponse::from));
    }

    public UserResponse find(Long id) {
        return UserResponse.from(requireUser(id, actor()));
    }

    @Transactional
    public UserResponse update(Long id, UserUpdateRequest request) {
        User user = requireUser(id, actor());
        String hash = request.password() == null || request.password().isBlank()
                ? null : passwordEncoder.encode(request.password());
        user.update(request.name(), request.role(), request.status(), hash);
        return UserResponse.from(user);
    }

    @Transactional
    public void delete(Long id) {
        requireUser(id, actor()).delete();
    }

    private User requireUser(Long id, User actor) {
        return userRepository.findByIdAndSchoolCode(id, actor.getSchoolCode())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }

    private User actor() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(User.normalizeEmail(email))
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }
}
