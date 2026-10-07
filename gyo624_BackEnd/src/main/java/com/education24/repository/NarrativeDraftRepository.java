package com.education24.repository;

import com.education24.domain.NarrativeDraft;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NarrativeDraftRepository extends JpaRepository<NarrativeDraft,Long> {
    List<NarrativeDraft> findAllByOrderByCreatedAtDesc();
    List<NarrativeDraft> findAllByTeacherIdOrderByCreatedAtDesc(Long teacherId);
    @Query("select distinct d from NarrativeDraft d left join fetch d.sentences s left join fetch s.evidences se left join fetch se.evidence where d.id=:id")
    Optional<NarrativeDraft> findDetail(@Param("id") Long id);
    @Query("select distinct d from NarrativeDraft d join d.sentences s join s.evidences se where se.evidence.id=:evidenceId")
    List<NarrativeDraft> findAllLinkedToEvidence(@Param("evidenceId") Long evidenceId);
}
