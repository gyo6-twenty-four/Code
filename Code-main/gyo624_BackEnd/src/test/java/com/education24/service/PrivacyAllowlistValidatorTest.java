package com.education24.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import com.education24.dto.request.LlmGenerationRequest;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

class PrivacyAllowlistValidatorTest {
    @Test
    void llmEvidenceDtoContainsOnlyAllowlistedFields() {
        Set<String> fields = Arrays.stream(LlmGenerationRequest.Evidence.class.getRecordComponents())
                .map(component -> component.getName())
                .collect(Collectors.toSet());

        assertThat(fields).containsExactlyInAnyOrder(
                "pseudonymId", "evidenceId", "content", "subject", "activity");
        assertThatCode(() -> new PrivacyAllowlistValidator().validate(new LlmGenerationRequest(
                List.of(new LlmGenerationRequest.Evidence("P-1", 1L, "내용", "과목", "활동")))))
                .doesNotThrowAnyException();
    }
}
