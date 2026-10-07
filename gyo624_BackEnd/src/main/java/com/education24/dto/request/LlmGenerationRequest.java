package com.education24.dto.request;

import java.util.List;

public record LlmGenerationRequest(List<Evidence> evidences) {
    public record Evidence(
            String pseudonymId,
            Long evidenceId,
            String content,
            String subject,
            String activity) {
    }
}
