package com.education24.dto.request;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record CatalogRequest(@NotBlank @Size(max = 100) String name,
        @Schema(defaultValue = "true") Boolean active) {}
