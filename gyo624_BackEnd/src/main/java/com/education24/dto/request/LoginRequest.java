package com.education24.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank @Email String email,
        @NotBlank @Schema(accessMode = Schema.AccessMode.WRITE_ONLY) String password) {
}
