package com.education24.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.education24.domain.Activity;
import com.education24.domain.EvidenceSnapshot;
import com.education24.domain.NarrativeDraft;
import com.education24.domain.Observation;
import com.education24.domain.Student;
import com.education24.domain.Subject;
import com.education24.domain.User;
import com.education24.dto.request.NarrativeRequest;
import com.education24.dto.response.LlmGenerationResponse;
import com.education24.exception.BusinessException;
import com.education24.exception.ErrorCode;
import com.education24.repository.EvidenceSnapshotRepository;
import com.education24.repository.NarrativeDraftRepository;
import com.education24.repository.NarrativeSentenceRepository;
import com.education24.repository.StudentRepository;
import com.education24.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class NarrativeServiceTest {
    @Mock NarrativeDraftRepository drafts;
    @Mock NarrativeSentenceRepository sentences;
    @Mock EvidenceSnapshotRepository evidences;
    @Mock StudentRepository students;
    @Mock UserRepository users;
    @Mock NarrativeGenerator generator;
    @Mock AuditService audit;
    private NarrativeService service;

    @BeforeEach
    void setUp() {
        service = new NarrativeService(drafts, sentences, evidences, students, users, generator,
                new PrivacyAllowlistValidator(), audit);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("teacher@test.dev", "x"));
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void generatorMockCreatesDraftWithAllowedEvidence() {
        User teacher = org.mockito.Mockito.mock(User.class);
        Student student = org.mockito.Mockito.mock(Student.class);
        EvidenceSnapshot evidence = org.mockito.Mockito.mock(EvidenceSnapshot.class);
        Observation observation = org.mockito.Mockito.mock(Observation.class);
        Subject subject = org.mockito.Mockito.mock(Subject.class);
        Activity activity = org.mockito.Mockito.mock(Activity.class);
        when(users.findByEmail("teacher@test.dev")).thenReturn(Optional.of(teacher));
        when(teacher.getId()).thenReturn(10L);
        when(students.findById(1L)).thenReturn(Optional.of(student));
        when(student.getId()).thenReturn(1L);
        when(student.getPseudonymId()).thenReturn("P-001");
        when(evidences.findAllDetailByIdIn(Set.of(7L))).thenReturn(List.of(evidence));
        when(evidence.getId()).thenReturn(7L);
        when(evidence.getStudent()).thenReturn(student);
        when(evidence.getStatus()).thenReturn(EvidenceSnapshot.Status.ACTIVE);
        when(evidence.getObservation()).thenReturn(observation);
        when(observation.getTeacher()).thenReturn(teacher);
        when(evidence.getSubject()).thenReturn(subject);
        when(subject.getName()).thenReturn("국어");
        when(evidence.getActivity()).thenReturn(activity);
        when(activity.getName()).thenReturn("토론");
        when(evidence.getContent()).thenReturn("승인된 관찰");
        when(drafts.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(sentences.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(generator.generate(any())).thenReturn(new LlmGenerationResponse(
                List.of(new LlmGenerationResponse.Sentence("생성 문장", Set.of(7L))),
                "mock", "mock-model", "v1"));

        var response = service.generate(new NarrativeRequest.Generate(1L, Set.of(7L)));

        assertThat(response.status()).isEqualTo(NarrativeDraft.Status.DRAFT);
        assertThat(response.sentences()).hasSize(1);
        verify(generator).generate(any());
    }

    @Test
    void generationRejectsZeroEvidence() {
        User teacher = org.mockito.Mockito.mock(User.class);
        Student student = org.mockito.Mockito.mock(Student.class);
        when(users.findByEmail("teacher@test.dev")).thenReturn(Optional.of(teacher));
        when(students.findById(1L)).thenReturn(Optional.of(student));

        assertThatThrownBy(() -> service.generate(new NarrativeRequest.Generate(1L, Set.of())))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.EVIDENCE_REQUIRED));
        verify(generator, never()).generate(any());
    }
}
