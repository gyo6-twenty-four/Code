package com.education24.repository;
import com.education24.domain.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface StudentRepository extends JpaRepository<Student, Long> {
    boolean existsByPseudonymId(String pseudonymId);
    boolean existsBySchoolCodeAndPseudonymId(String schoolCode, String pseudonymId);
    List<Student> findAllBySchoolCodeOrderById(String schoolCode);
    Optional<Student> findByIdAndSchoolCode(Long id, String schoolCode);
}
