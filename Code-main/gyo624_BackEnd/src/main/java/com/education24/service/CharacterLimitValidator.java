package com.education24.service;

import com.education24.domain.NarrativeDraft;
import com.education24.domain.ValidationPolicy;
import com.education24.exception.BusinessException;
import com.education24.exception.ErrorCode;
import com.education24.repository.ValidationPolicyRepository;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class CharacterLimitValidator implements NarrativeValidator {
    private final ValidationPolicyRepository policies;

    public CharacterLimitValidator(ValidationPolicyRepository policies) {
        this.policies = policies;
    }

    @Override
    public List<Check> validate(NarrativeDraft draft) {
        List<Check> checks = new ArrayList<>();
        policies.findAllByActiveTrue().stream()
                .filter(p -> p.getPolicyType() == ValidationPolicy.PolicyType.CHARACTER_LIMIT)
                .forEach(policy -> apply(draft, policy, checks));
        return checks;
    }

    private void apply(NarrativeDraft draft, ValidationPolicy policy, List<Check> checks) {
        int limit;
        try {
            limit = Integer.parseInt(policy.getPolicyValue());
        } catch (NumberFormatException exception) {
            throw new BusinessException(ErrorCode.INVALID_POLICY_VALUE);
        }
        if (limit < 1) {
            throw new BusinessException(ErrorCode.INVALID_POLICY_VALUE);
        }
        if (policy.getTargetType() == ValidationPolicy.TargetType.DRAFT) {
            int length = draft.getSentences().stream().mapToInt(s -> length(s.content())).sum();
            checks.add(check(null, policy, length <= limit, limit));
        } else {
            draft.getSentences().forEach(sentence ->
                    checks.add(check(sentence, policy, length(sentence.content()) <= limit, limit)));
        }
    }

    private Check check(com.education24.domain.NarrativeSentence sentence, ValidationPolicy policy,
            boolean withinLimit, int limit) {
        boolean passed = withinLimit || policy.getSeverity() == ValidationPolicy.Severity.WARNING;
        String message = withinLimit ? "글자 수 제한 충족"
                : (policy.getSeverity() == ValidationPolicy.Severity.WARNING ? "경고: " : "") + limit + "자 제한 초과";
        return new Check(sentence, "CHARACTER_LIMIT_" + policy.getSeverity(), passed, message);
    }

    private int length(String value) {
        return value.codePointCount(0, value.length());
    }
}
