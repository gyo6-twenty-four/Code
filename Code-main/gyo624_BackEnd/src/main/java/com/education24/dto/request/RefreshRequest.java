package com.education24.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RefreshRequest(
        @NotBlank @Size(max = 4096) @Schema(accessMode = Schema.AccessMode.WRITE_ONLY) String refreshToken) {
}
