package com.education24.service;

import com.education24.dto.request.LlmGenerationRequest;
import com.education24.dto.response.LlmGenerationResponse;

public interface NarrativeGenerator {
    LlmGenerationResponse generate(LlmGenerationRequest request);
}
