package com.education24.dto.request;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.Set;
public record ObservationRequest(
    @NotNull Long studentId, @NotNull Long subjectId, @NotNull Long activityId,
    @NotBlank @Size(max = 10000) String content, @NotNull @PastOrPresent Instant observedAt,
    Set<Long> tagIds) {}
