package com.education24.dto.response;
import java.time.Instant;
public record CatalogResponse(Long id, Long subjectId, String name, boolean active,
        Instant createdAt, Instant updatedAt) {}
