package com.education24.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.education24.domain.NarrativeDraft;
import com.education24.domain.NarrativeSentence;
import com.education24.domain.Student;
import com.education24.domain.User;
import com.education24.exception.BusinessException;
import com.education24.exception.ErrorCode;
import com.education24.repository.NarrativeDraftRepository;
import com.education24.repository.UserRepository;
import com.education24.repository.ValidationResultRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class NarrativeValidationTest {
    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void editingSentenceMarksDraftForRevalidation() {
        NarrativeDraft draft = new NarrativeDraft(mock(Student.class), mock(User.class));
        draft.generated("mock", "model", "v1");
        NarrativeSentence sentence = new NarrativeSentence(draft, 1, "원문");
        draft.addSentence(sentence);

        sentence.edit("수정문");

        assertThat(draft.getStatus()).isEqualTo(NarrativeDraft.Status.NEEDS_REVALIDATION);
    }

    @Test
    void evidenceValidatorRejectsSentenceWithoutEvidence() {
        NarrativeDraft draft = new NarrativeDraft(mock(Student.class), mock(User.class));
        draft.generated("mock", "model", "v1");
        draft.addSentence(new NarrativeSentence(draft, 1, "문장"));

        var checks = new EvidenceConnectionValidator().validate(draft);

        assertThat(checks).anyMatch(check -> check.ruleType().equals("EVIDENCE_REQUIRED") && !check.passed());
    }

    @Test
    void finalizeBlocksDraftThatIsNotValid() {
        NarrativeDraftRepository drafts = mock(NarrativeDraftRepository.class);
        ValidationResultRepository results = mock(ValidationResultRepository.class);
        UserRepository users = mock(UserRepository.class);
        AuditService audit = mock(AuditService.class);
        User teacher = mock(User.class);
        when(teacher.getId()).thenReturn(3L);
        Student student = mock(Student.class);
        NarrativeDraft draft = new NarrativeDraft(student, teacher);
        draft.generated("mock", "model", "v1");
        when(drafts.findDetail(9L)).thenReturn(Optional.of(draft));
        when(users.findByEmail("teacher@test.dev")).thenReturn(Optional.of(teacher));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("teacher@test.dev", "x"));
        ValidationService service = new ValidationService(drafts, results, users, List.of(), audit);

        assertThatThrownBy(() -> service.finalizeDraft(9L))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.FINALIZATION_BLOCKED));
    }
}
