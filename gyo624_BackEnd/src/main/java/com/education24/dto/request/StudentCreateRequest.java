package com.education24.dto.request;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record StudentCreateRequest(
    @NotBlank @Size(max = 100) String pseudonymId,
    @NotBlank @Size(max = 100) String realName,
    @Size(max = 100) String internalIdentifier) {}
