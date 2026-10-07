package com.education24.repository;
import com.education24.domain.Student;
import org.springframework.data.jpa.repository.JpaRepository;
public interface StudentRepository extends JpaRepository<Student, Long> {
    boolean existsByPseudonymId(String pseudonymId);
}
