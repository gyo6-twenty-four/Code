package com.education24.dto.request;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
public record ActivityRequest(@NotNull Long subjectId, @NotBlank @Size(max = 150) String name,
        Boolean active) {}
