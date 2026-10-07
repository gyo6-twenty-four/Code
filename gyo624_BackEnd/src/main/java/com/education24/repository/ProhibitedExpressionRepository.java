package com.education24.repository;
import com.education24.domain.ProhibitedExpression;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ProhibitedExpressionRepository extends JpaRepository<ProhibitedExpression,Long>{
 List<ProhibitedExpression> findAllByActiveTrue();
 boolean existsByExpression(String expression);
 boolean existsByExpressionAndIdNot(String expression,Long id);
}
