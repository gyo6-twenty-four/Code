package com.education24.repository;
import com.education24.domain.ValidationPolicy;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ValidationPolicyRepository extends JpaRepository<ValidationPolicy,Long>{
 List<ValidationPolicy> findAllByActiveTrue();
 boolean existsByPolicyTypeAndTargetTypeAndPolicyValue(ValidationPolicy.PolicyType type,ValidationPolicy.TargetType target,String value);
}
