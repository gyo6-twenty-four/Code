package com.education24.dto.request;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record StudentUpdateRequest(
    @NotBlank @Size(max = 100) String pseudonymId,
    @NotBlank @Size(max = 100) String realName,
    @Size(max = 100) String internalIdentifier) {}
