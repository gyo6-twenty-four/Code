package com.education24.repository;

import com.education24.domain.EvidenceSnapshot;
import com.education24.domain.Observation;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

public final class EvidenceSpecifications {
    private EvidenceSpecifications() {}

    public static Specification<EvidenceSnapshot> search(Long studentId, Long subjectId, Instant from, Instant to,
            Long tagId, EvidenceSnapshot.Status status, Long teacherId, boolean admin) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (studentId != null) {
                predicates.add(cb.equal(root.get("student").get("id"), studentId));
            }
            if (subjectId != null) {
                predicates.add(cb.equal(root.get("subject").get("id"), subjectId));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("approvedAt"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("approvedAt"), to));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (tagId != null || !admin) {
                Join<EvidenceSnapshot, Observation> observation = root.join("observation");
                if (tagId != null) {
                    predicates.add(cb.equal(observation.join("tags").get("id"), tagId));
                    query.distinct(true);
                }
                if (!admin) {
                    predicates.add(cb.equal(observation.get("teacher").get("id"), teacherId));
                }
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
