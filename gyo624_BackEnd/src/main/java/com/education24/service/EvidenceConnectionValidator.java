package com.education24.service;

import com.education24.domain.EvidenceSnapshot;
import com.education24.domain.NarrativeDraft;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class EvidenceConnectionValidator implements NarrativeValidator {
    @Override
    public List<Check> validate(NarrativeDraft draft) {
        List<Check> checks = new ArrayList<>();
        checks.add(new Check(null, "DRAFT_HAS_SENTENCE", !draft.getSentences().isEmpty(),
                draft.getSentences().isEmpty() ? "초안에 문장이 없습니다." : "문장 존재"));
        draft.getSentences().forEach(sentence -> {
            boolean hasEvidence = !sentence.getEvidences().isEmpty();
            boolean confirmed = hasEvidence && sentence.isConnectionConfirmed()
                    && sentence.getEvidences().stream().allMatch(link -> link.isConfirmedByTeacher());
            boolean active = hasEvidence && sentence.getEvidences().stream()
                    .allMatch(link -> link.getEvidence().getStatus() == EvidenceSnapshot.Status.ACTIVE);
            checks.add(new Check(sentence, "EVIDENCE_REQUIRED", hasEvidence,
                    hasEvidence ? "근거 연결 존재" : "문장당 하나 이상의 근거가 필요합니다."));
            checks.add(new Check(sentence, "EVIDENCE_TEACHER_CONFIRMED", confirmed,
                    confirmed ? "교사 연결 확인 완료" : "교사의 근거 연결 확인이 필요합니다."));
            checks.add(new Check(sentence, "EVIDENCE_ACTIVE", active,
                    active ? "모든 근거가 ACTIVE 상태" : "취소된 근거가 연결되어 있습니다."));
        });
        return checks;
    }
}
