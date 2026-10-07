package com.education24.repository;
import com.education24.domain.NarrativeSentence;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
public interface NarrativeSentenceRepository extends JpaRepository<NarrativeSentence,Long>{
 @Query("select distinct s from NarrativeSentence s left join fetch s.evidences se left join fetch se.evidence where s.id=:id")
 Optional<NarrativeSentence> findDetail(@Param("id") Long id);
 @Query("select distinct s from NarrativeSentence s join fetch s.evidences se where s.draft.id=:draftId and se.evidence.id=:evidenceId")
 List<NarrativeSentence> findByDraftAndEvidence(@Param("draftId")Long draftId,@Param("evidenceId")Long evidenceId);
}
