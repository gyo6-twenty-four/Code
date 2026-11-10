package com.education24.dto.response;

import com.education24.domain.User;
import java.time.Instant;

public record UserResponse(
        Long id,
        String email,
        String name,
        String schoolCode,
        User.Role role,
        User.UserStatus status,
        Instant createdAt,
        Instant updatedAt) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getName(), user.getSchoolCode(), user.getRole(),
                user.getStatus(), user.getCreatedAt(), user.getUpdatedAt());
    }
}
