package com.education24.repository;
import com.education24.domain.Observation;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ObservationRepository extends JpaRepository<Observation, Long> {
    boolean existsByStudentId(Long studentId);
}
