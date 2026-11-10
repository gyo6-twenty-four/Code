package com.education24.dto.response;
import com.education24.domain.EvidenceSnapshot;
import java.time.Instant;
public record EvidenceResponse(Long id, Long observationId, Long studentId, Long subjectId,
        Long activityId, String content, Long approvedBy, Instant approvedAt,
        EvidenceSnapshot.Status status) {
    public static EvidenceResponse from(EvidenceSnapshot e) {
        return new EvidenceResponse(e.getId(), e.getObservation().getId(), e.getStudent().getId(),
                e.getSubject().getId(), e.getActivity().getId(), e.getContent(),
                e.getApprovedBy().getId(), e.getApprovedAt(), e.getStatus());
    }
}
