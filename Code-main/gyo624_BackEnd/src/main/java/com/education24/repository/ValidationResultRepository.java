package com.education24.repository;
import com.education24.domain.ValidationResult;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ValidationResultRepository extends JpaRepository<ValidationResult,Long>{
 List<ValidationResult> findAllByDraftIdOrderByCreatedAtDesc(Long draftId);
 List<ValidationResult> findAllByDraftIdAndCreatedAt(Long draftId,java.time.Instant createdAt);
}
