package com.education24.service;

import com.education24.domain.NarrativeDraft;
import com.education24.domain.NarrativeSentence;
import java.util.List;

public interface NarrativeValidator {
    List<Check> validate(NarrativeDraft draft);

    record Check(NarrativeSentence sentence, String ruleType, boolean passed, String message) {
    }
}
