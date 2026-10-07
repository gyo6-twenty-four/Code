package com.education24.service;

import com.education24.domain.*;
import com.education24.dto.request.*;
import com.education24.dto.response.StudentResponse;
import com.education24.exception.*;
import com.education24.repository.*;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @Transactional(readOnly = true)
public class StudentService {
    private final StudentRepository students; private final StudentIdentityRepository identities;
    private final ObservationRepository observations; private final EvidenceSnapshotRepository evidences;
    public StudentService(StudentRepository students, StudentIdentityRepository identities,
            ObservationRepository observations, EvidenceSnapshotRepository evidences) {
        this.students = students; this.identities = identities; this.observations = observations; this.evidences = evidences;
    }
    @Transactional public StudentResponse create(StudentCreateRequest r) {
        if (students.existsByPseudonymId(r.pseudonymId())) throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE);
        Student s = students.save(new Student(r.pseudonymId()));
        return StudentResponse.of(s, identities.save(new StudentIdentity(s, r.realName(), r.internalIdentifier())));
    }
    public List<StudentResponse> findAll() {
        return students.findAll().stream().map(s -> StudentResponse.of(s, identity(s.getId()))).toList();
    }
    public StudentResponse find(Long id) { Student s = student(id); return StudentResponse.of(s, identity(id)); }
    @Transactional public StudentResponse update(Long id, StudentUpdateRequest r) {
        Student s = student(id);
        if (!s.getPseudonymId().equals(r.pseudonymId()) && students.existsByPseudonymId(r.pseudonymId()))
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE);
        s.update(r.pseudonymId()); StudentIdentity i = identity(id); i.update(r.realName(), r.internalIdentifier());
        return StudentResponse.of(s, i);
    }
    @Transactional public void delete(Long id) {
        Student s = student(id);
        if (observations.existsByStudentId(id) || evidences.existsByStudentId(id))
            throw new BusinessException(ErrorCode.STUDENT_DELETE_CONFLICT);
        identities.delete(identity(id)); students.delete(s);
    }
    private Student student(Long id) { return students.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.STUDENT_NOT_FOUND)); }
    private StudentIdentity identity(Long id) { return identities.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.STUDENT_NOT_FOUND)); }
}
