package com.education24.repository;
import com.education24.domain.Tag;
import java.util.Set;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
public interface TagRepository extends JpaRepository<Tag, Long> {
    boolean existsByName(String name);
    Optional<Tag> findByName(String name);
    Set<Tag> findAllByIdIn(Set<Long> ids);
}
