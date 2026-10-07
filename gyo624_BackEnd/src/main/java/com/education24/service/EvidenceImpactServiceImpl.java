package com.education24.service;

import com.education24.domain.NarrativeDraft;
import com.education24.domain.Notification;
import com.education24.repository.NarrativeDraftRepository;
import com.education24.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EvidenceImpactServiceImpl implements EvidenceImpactService {
    private final NarrativeDraftRepository drafts;
    private final NotificationRepository notifications;
    private final AuditService audit;

    public EvidenceImpactServiceImpl(NarrativeDraftRepository drafts,
            NotificationRepository notifications, AuditService audit) {
        this.drafts = drafts;
        this.notifications = notifications;
        this.audit = audit;
    }

    @Override
    @Transactional
    public void evidenceRevoked(Long evidenceId, Long studentId) {
        audit.recordCurrent("EVIDENCE_REVOKED", "EVIDENCE", evidenceId, "status=REVOKED");
        for (NarrativeDraft draft : drafts.findAllLinkedToEvidence(evidenceId)) {
            if (draft.getStatus() == NarrativeDraft.Status.FINALIZED) {
                notifications.save(new Notification(draft.getTeacher(), "FINALIZED_EVIDENCE_REVOKED",
                        "최종 확정 초안의 연결 근거가 취소되었습니다. 초안 상태는 변경되지 않습니다."));
                audit.recordCurrent("FINALIZED_NARRATIVE_EVIDENCE_IMPACT", "NARRATIVE_DRAFT",
                        draft.getId(), "status=FINALIZED; evidenceStatus=REVOKED");
            } else {
                draft.needsRevalidation();
                notifications.save(new Notification(draft.getTeacher(), "NARRATIVE_NEEDS_REVALIDATION",
                        "초안의 연결 근거가 취소되어 재검증이 필요합니다."));
                audit.recordCurrent("NARRATIVE_EVIDENCE_IMPACT", "NARRATIVE_DRAFT",
                        draft.getId(), "status=NEEDS_REVALIDATION; evidenceStatus=REVOKED");
            }
        }
    }
}
