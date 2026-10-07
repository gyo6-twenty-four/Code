package com.education24.dto.response;

import java.util.List;
import java.util.Set;

public record LlmGenerationResponse(
        List<Sentence> sentences,
        String provider,
        String model,
        String promptVersion) {
    public record Sentence(String content, Set<Long> evidenceIds) {
    }
}
