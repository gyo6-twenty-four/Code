package com.education24.dto.request;

import com.education24.domain.User;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UserUpdateRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull User.Role role,
        @NotNull User.UserStatus status,
        @Size(min = 8, max = 100)
        @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$",
                message = "비밀번호는 영문과 숫자를 포함해야 합니다.")
        @Schema(accessMode = Schema.AccessMode.WRITE_ONLY) String password) {
}
