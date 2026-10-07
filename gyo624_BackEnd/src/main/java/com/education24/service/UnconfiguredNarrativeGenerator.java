package com.education24.service;

import com.education24.dto.request.LlmGenerationRequest;
import com.education24.dto.response.LlmGenerationResponse;
import com.education24.exception.BusinessException;
import com.education24.exception.ErrorCode;

public final class UnconfiguredNarrativeGenerator implements NarrativeGenerator {
    @Override
    public LlmGenerationResponse generate(LlmGenerationRequest request) {
        throw new BusinessException(ErrorCode.LLM_GENERATOR_NOT_CONFIGURED);
    }
}
