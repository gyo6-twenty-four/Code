package com.education24.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.education24.domain.NarrativeDraft;
import com.education24.domain.Student;
import com.education24.domain.User;
import com.education24.repository.NarrativeDraftRepository;
import com.education24.repository.NotificationRepository;
import java.util.List;
import org.junit.jupiter.api.Test;

class EvidenceImpactServiceTest {
    @Test
    void revokeRevalidatesOpenDraftButKeepsFinalizedDraftStatus() {
        NarrativeDraftRepository drafts = mock(NarrativeDraftRepository.class);
        NotificationRepository notifications = mock(NotificationRepository.class);
        AuditService audit = mock(AuditService.class);
        User teacher = mock(User.class);
        NarrativeDraft open = new NarrativeDraft(mock(Student.class), teacher);
        open.generated("mock", "model", "v1");
        NarrativeDraft finalized = new NarrativeDraft(mock(Student.class), teacher);
        finalized.generated("mock", "model", "v1");
        finalized.validated(true);
        finalized.finalizeDraft();
        when(drafts.findAllLinkedToEvidence(7L)).thenReturn(List.of(open, finalized));
        EvidenceImpactServiceImpl service = new EvidenceImpactServiceImpl(drafts, notifications, audit);

        service.evidenceRevoked(7L, 1L);

        assertThat(open.getStatus()).isEqualTo(NarrativeDraft.Status.NEEDS_REVALIDATION);
        assertThat(finalized.getStatus()).isEqualTo(NarrativeDraft.Status.FINALIZED);
        verify(notifications, times(2)).save(any());
    }
}
