package com.education24.dto.response;
import com.education24.domain.Observation;
import java.time.Instant;
import java.util.Set;
import java.util.stream.Collectors;
public record ObservationResponse(Long id, Long studentId, Long teacherId, Long subjectId,
        Long activityId, String content, Instant observedAt, Observation.Status status, long version,
        String rejectionReason, Set<Long> tagIds, Instant createdAt, Instant updatedAt) {
    public static ObservationResponse from(Observation o) {
        return new ObservationResponse(o.getId(), o.getStudent().getId(), o.getTeacher().getId(),
                o.getSubject().getId(), o.getActivity().getId(), o.getContent(), o.getObservedAt(),
                o.getStatus(), o.getVersion(), o.getRejectionReason(),
                o.getTags().stream().map(t -> t.getId()).collect(Collectors.toSet()),
                o.getCreatedAt(), o.getUpdatedAt());
    }
}
