package com.education24.repository;

import com.education24.domain.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    Page<User> findAllBySchoolCode(String schoolCode, Pageable pageable);
    Optional<User> findByIdAndSchoolCode(Long id, String schoolCode);
}
