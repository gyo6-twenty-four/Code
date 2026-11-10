package com.education24.repository;
import com.education24.domain.StudentIdentity;
import org.springframework.data.jpa.repository.JpaRepository;
public interface StudentIdentityRepository extends JpaRepository<StudentIdentity, Long> {}
