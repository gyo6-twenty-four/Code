package com.education24.repository;

import com.education24.domain.EvidenceSnapshot;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EvidenceSnapshotRepository extends JpaRepository<EvidenceSnapshot, Long>,
        JpaSpecificationExecutor<EvidenceSnapshot> {
    Optional<EvidenceSnapshot> findByObservationIdAndStatus(Long observationId, EvidenceSnapshot.Status status);
    boolean existsByStudentId(Long studentId);

    @Query("select e from EvidenceSnapshot e join fetch e.student join fetch e.subject "
            + "join fetch e.activity join fetch e.observation where e.id in :ids")
    List<EvidenceSnapshot> findAllDetailByIdIn(@Param("ids") Collection<Long> ids);
}
