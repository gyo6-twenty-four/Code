package com.education24.repository;
import com.education24.domain.SentenceEvidence;
import org.springframework.data.jpa.repository.JpaRepository;
public interface SentenceEvidenceRepository extends JpaRepository<SentenceEvidence,SentenceEvidence.Id>{}
