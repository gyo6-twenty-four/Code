package com.education24.service;

import com.education24.domain.NarrativeDraft;
import com.education24.domain.User;
import com.education24.domain.ValidationResult;
import com.education24.dto.response.NarrativeResponse;
import com.education24.dto.response.ValidationResponse;
import com.education24.exception.BusinessException;
import com.education24.exception.ErrorCode;
import com.education24.repository.NarrativeDraftRepository;
import com.education24.repository.UserRepository;
import com.education24.repository.ValidationResultRepository;
import java.util.List;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ValidationService {
    private final NarrativeDraftRepository drafts;
    private final ValidationResultRepository results;
    private final UserRepository users;
    private final List<NarrativeValidator> validators;
    private final AuditService audit;

    public ValidationService(NarrativeDraftRepository drafts, ValidationResultRepository results,
            UserRepository users, List<NarrativeValidator> validators, AuditService audit) {
        this.drafts = drafts;
        this.results = results;
        this.users = users;
        this.validators = validators;
        this.audit = audit;
    }

    @Transactional
    public ValidationResponse validate(Long draftId) {
        User actor = actor();
        NarrativeDraft draft = owned(draftId, actor);
        requireValidatable(draft);
        List<ValidationResult> saved = run(draft);
        audit.record(actor, "NARRATIVE_VALIDATED", "NARRATIVE_DRAFT", draftId,
                "status=" + draft.getStatus().name());
        return ValidationResponse.from(saved);
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public NarrativeResponse finalizeDraft(Long draftId) {
        User actor = actor();
        NarrativeDraft draft = owned(draftId, actor);
        if (draft.getStatus() != NarrativeDraft.Status.VALID) {
            throw new BusinessException(ErrorCode.FINALIZATION_BLOCKED);
        }
        List<ValidationResult> latest = run(draft);
        if (latest.stream().anyMatch(result -> !result.isPassed())) {
            throw new BusinessException(ErrorCode.FINALIZATION_BLOCKED);
        }
        draft.finalizeDraft();
        audit.record(actor, "NARRATIVE_FINALIZED", "NARRATIVE_DRAFT", draftId, "status=FINALIZED");
        return NarrativeResponse.from(draft);
    }

    private List<ValidationResult> run(NarrativeDraft draft) {
        List<ValidationResult> validations = validators.stream()
                .flatMap(validator -> validator.validate(draft).stream())
                .map(check -> new ValidationResult(draft, check.sentence(), check.ruleType(),
                        check.passed(), check.message()))
                .toList();
        if (validations.isEmpty()) {
            validations = List.of(new ValidationResult(draft, null, "VALIDATORS_CONFIGURED", false,
                    "실행 가능한 검증기가 없습니다."));
        }
        List<ValidationResult> saved = results.saveAll(validations);
        draft.validated(saved.stream().allMatch(ValidationResult::isPassed));
        return saved;
    }

    private NarrativeDraft owned(Long id, User actor) {
        NarrativeDraft draft = drafts.findDetail(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.DRAFT_NOT_FOUND));
        if (actor.getRole() != User.Role.ADMIN && !draft.getTeacher().getId().equals(actor.getId())) {
            throw new BusinessException(ErrorCode.DRAFT_ACCESS_DENIED);
        }
        return draft;
    }

    private void requireValidatable(NarrativeDraft draft) {
        if (draft.getStatus() == NarrativeDraft.Status.GENERATING
                || draft.getStatus() == NarrativeDraft.Status.GENERATION_FAILED
                || draft.getStatus() == NarrativeDraft.Status.FINALIZED) {
            throw new BusinessException(ErrorCode.INVALID_DRAFT_STATUS);
        }
    }

    private User actor() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return users.findByEmail(User.normalizeEmail(email))
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }
}
