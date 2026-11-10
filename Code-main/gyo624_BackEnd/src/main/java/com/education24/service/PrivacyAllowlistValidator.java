package com.education24.service;

import com.education24.dto.request.LlmGenerationRequest;
import com.education24.exception.BusinessException;
import com.education24.exception.ErrorCode;
import java.util.Arrays;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class PrivacyAllowlistValidator {
    private static final Set<String> ALLOWED =
            Set.of("pseudonymId", "evidenceId", "content", "subject", "activity");

    public void validate(LlmGenerationRequest request) {
        if (request == null || request.evidences() == null || request.evidences().isEmpty()) {
            throw new BusinessException(ErrorCode.EVIDENCE_REQUIRED);
        }
        Set<String> fields = Arrays.stream(LlmGenerationRequest.Evidence.class.getRecordComponents())
                .map(component -> component.getName())
                .collect(java.util.stream.Collectors.toUnmodifiableSet());
        if (!fields.equals(ALLOWED)) {
            throw new BusinessException(ErrorCode.PRIVACY_FIELD_NOT_ALLOWED);
        }
    }

    public Set<String> allowedFields() {
        return ALLOWED;
    }
}
