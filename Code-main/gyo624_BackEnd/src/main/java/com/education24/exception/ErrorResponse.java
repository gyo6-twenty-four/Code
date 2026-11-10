package com.education24.exception;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;

public record ErrorResponse(
        @Schema(example = "2026-09-16T07:00:00Z") Instant timestamp,
        @Schema(example = "INVALID_REQUEST") String code,
        @Schema(example = "Invalid request.") String message,
        @Schema(example = "/api/v1/auth/login") String path,
        List<FieldError> errors) {
    public static ErrorResponse of(ErrorCode code, String message, String path) {
        return new ErrorResponse(Instant.now(), code.name(), message, path, List.of());
    }

    public record FieldError(String field, String message) {
    }
}
