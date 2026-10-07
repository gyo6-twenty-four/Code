package com.education24.service;

import com.education24.domain.NarrativeDraft;
import com.education24.domain.ProhibitedExpression;
import com.education24.repository.ProhibitedExpressionRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class ProhibitedExpressionValidator implements NarrativeValidator {
    private final ProhibitedExpressionRepository expressions;

    public ProhibitedExpressionValidator(ProhibitedExpressionRepository expressions) {
        this.expressions = expressions;
    }

    @Override
    public List<Check> validate(NarrativeDraft draft) {
        List<Check> checks = new ArrayList<>();
        List<ProhibitedExpression> active = expressions.findAllByActiveTrue();
        draft.getSentences().forEach(sentence -> active.forEach(expression -> {
            boolean found = matches(sentence.content(), expression);
            checks.add(new Check(sentence, "PROHIBITED_EXPRESSION_" + expression.getMatchType(),
                    !found, found ? "금지 표현 정책 위반" : "금지 표현 없음"));
        }));
        return checks;
    }

    private boolean matches(String content, ProhibitedExpression expression) {
        return switch (expression.getMatchType()) {
            case EXACT -> content.equals(expression.getExpression());
            case CONTAINS -> content.contains(expression.getExpression());
            case REGEX -> Pattern.compile(expression.getExpression()).matcher(content).find();
        };
    }
}
