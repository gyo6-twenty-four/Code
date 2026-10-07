package com.education24.dto.response;

import com.education24.domain.User;

public record MeResponse(Long id, String email, String name, User.Role role) {
    public static MeResponse from(User user) {
        return new MeResponse(user.getId(), user.getEmail(), user.getName(), user.getRole());
    }
}
