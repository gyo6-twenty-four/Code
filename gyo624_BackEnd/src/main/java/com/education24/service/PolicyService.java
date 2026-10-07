package com.education24.service;

import com.education24.domain.ProhibitedExpression;
import com.education24.domain.User;
import com.education24.domain.ValidationPolicy;
import com.education24.dto.request.ProhibitedExpressionRequest;
import com.education24.dto.request.ValidationPolicyRequest;
import com.education24.dto.response.PolicyResponse;
import com.education24.exception.BusinessException;
import com.education24.exception.ErrorCode;
import com.education24.repository.ProhibitedExpressionRepository;
import com.education24.repository.UserRepository;
import com.education24.repository.ValidationPolicyRepository;
import java.util.List;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class PolicyService {
    private final ValidationPolicyRepository policies;
    private final ProhibitedExpressionRepository expressions;
    private final UserRepository users;
    private final AuditService audit;

    public PolicyService(ValidationPolicyRepository policies, ProhibitedExpressionRepository expressions,
            UserRepository users, AuditService audit) {
        this.policies = policies;
        this.expressions = expressions;
        this.users = users;
        this.audit = audit;
    }

    public List<PolicyResponse.ValidationPolicyItem> policies() {
        return policies.findAll().stream().map(PolicyResponse.ValidationPolicyItem::from).toList();
    }

    public PolicyResponse.ValidationPolicyItem policy(Long id) {
        return PolicyResponse.ValidationPolicyItem.from(requirePolicy(id));
    }

    @Transactional
    public PolicyResponse.ValidationPolicyItem create(ValidationPolicyRequest request) {
        validatePolicy(request);
        User actor = admin();
        ValidationPolicy saved = policies.save(new ValidationPolicy(request.policyType(), request.targetType(),
                request.policyValue(), request.severity(), request.active(), actor));
        audit.record(actor, "VALIDATION_POLICY_CREATED", "VALIDATION_POLICY", saved.getId(), "policy changed");
        return PolicyResponse.ValidationPolicyItem.from(saved);
    }

    @Transactional
    public PolicyResponse.ValidationPolicyItem update(Long id, ValidationPolicyRequest request) {
        validatePolicy(request);
        User actor = admin();
        ValidationPolicy policy = requirePolicy(id);
        policy.update(request.policyType(), request.targetType(), request.policyValue(),
                request.severity(), request.active());
        audit.record(actor, "VALIDATION_POLICY_UPDATED", "VALIDATION_POLICY", id, "policy changed");
        return PolicyResponse.ValidationPolicyItem.from(policy);
    }

    @Transactional
    public void deletePolicy(Long id) {
        User actor = admin();
        ValidationPolicy policy = requirePolicy(id);
        policies.delete(policy);
        audit.record(actor, "VALIDATION_POLICY_DELETED", "VALIDATION_POLICY", id, "policy deleted");
    }

    public List<PolicyResponse.ProhibitedExpressionItem> expressions() {
        return expressions.findAll().stream().map(PolicyResponse.ProhibitedExpressionItem::from).toList();
    }

    public PolicyResponse.ProhibitedExpressionItem expression(Long id) {
        return PolicyResponse.ProhibitedExpressionItem.from(requireExpression(id));
    }

    @Transactional
    public PolicyResponse.ProhibitedExpressionItem create(ProhibitedExpressionRequest request) {
        validateExpression(request, null);
        User actor = admin();
        ProhibitedExpression saved = expressions.save(new ProhibitedExpression(request.expression(),
                request.matchType(), request.description(), request.active(), actor));
        audit.record(actor, "PROHIBITED_EXPRESSION_CREATED", "PROHIBITED_EXPRESSION", saved.getId(),
                "policy changed");
        return PolicyResponse.ProhibitedExpressionItem.from(saved);
    }

    @Transactional
    public PolicyResponse.ProhibitedExpressionItem update(Long id, ProhibitedExpressionRequest request) {
        validateExpression(request, id);
        User actor = admin();
        ProhibitedExpression expression = requireExpression(id);
        expression.update(request.expression(), request.matchType(), request.description(), request.active());
        audit.record(actor, "PROHIBITED_EXPRESSION_UPDATED", "PROHIBITED_EXPRESSION", id, "policy changed");
        return PolicyResponse.ProhibitedExpressionItem.from(expression);
    }

    @Transactional
    public void deleteExpression(Long id) {
        User actor = admin();
        ProhibitedExpression expression = requireExpression(id);
        expressions.delete(expression);
        audit.record(actor, "PROHIBITED_EXPRESSION_DELETED", "PROHIBITED_EXPRESSION", id, "policy deleted");
    }

    private void validatePolicy(ValidationPolicyRequest request) {
        if (request.policyType() == ValidationPolicy.PolicyType.CHARACTER_LIMIT) {
            try {
                if (Integer.parseInt(request.policyValue()) < 1) {
                    throw new NumberFormatException();
                }
            } catch (NumberFormatException exception) {
                throw new BusinessException(ErrorCode.INVALID_POLICY_VALUE);
            }
        }
    }

    private void validateExpression(ProhibitedExpressionRequest request, Long id) {
        boolean duplicate = id == null ? expressions.existsByExpression(request.expression())
                : expressions.existsByExpressionAndIdNot(request.expression(), id);
        if (duplicate) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE);
        }
        if (request.matchType() == ProhibitedExpression.MatchType.REGEX) {
            try {
                Pattern.compile(request.expression());
            } catch (PatternSyntaxException exception) {
                throw new BusinessException(ErrorCode.INVALID_REGULAR_EXPRESSION);
            }
        }
    }

    private ValidationPolicy requirePolicy(Long id) {
        return policies.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.VALIDATION_POLICY_NOT_FOUND));
    }

    private ProhibitedExpression requireExpression(Long id) {
        return expressions.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.PROHIBITED_EXPRESSION_NOT_FOUND));
    }

    private User admin() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User actor = users.findByEmail(User.normalizeEmail(email))
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        if (actor.getRole() != User.Role.ADMIN) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }
        return actor;
    }
}
