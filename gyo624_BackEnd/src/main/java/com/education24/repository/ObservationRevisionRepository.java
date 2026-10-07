package com.education24.repository;
import com.education24.domain.ObservationRevision;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ObservationRevisionRepository extends JpaRepository<ObservationRevision, Long> {
    long countByObservationId(Long observationId);
    Optional<ObservationRevision> findTopByObservationIdOrderByRevisionNumberDesc(Long observationId);
}
