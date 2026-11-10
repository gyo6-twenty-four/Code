package com.education24.repository;
import com.education24.domain.Activity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ActivityRepository extends JpaRepository<Activity, Long> {
    boolean existsBySubjectIdAndName(Long subjectId, String name);
    Optional<Activity> findBySubjectIdAndName(Long subjectId, String name);
}
