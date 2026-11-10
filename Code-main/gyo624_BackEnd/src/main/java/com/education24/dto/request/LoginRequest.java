package com.education24.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank @Email @Size(max = 160) String email,
        @NotBlank @Size(max = 100) @Schema(accessMode = Schema.AccessMode.WRITE_ONLY) String password) {
}
