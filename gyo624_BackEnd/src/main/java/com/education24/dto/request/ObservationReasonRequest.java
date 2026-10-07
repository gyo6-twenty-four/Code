package com.education24.dto.request;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record ObservationReasonRequest(@NotBlank @Size(max = 1000) String reason) {}
