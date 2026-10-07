package com.education24.service;
import com.education24.domain.*;
import com.education24.dto.response.*;
import com.education24.exception.*;
import com.education24.repository.*;
import com.education24.support.Pageables;
import java.time.Instant;
import java.util.Set;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service @Transactional(readOnly=true)
public class EvidenceService {
    private static final Set<String> SORTABLE = Set.of("id", "content", "approvedAt", "status");
    private final EvidenceSnapshotRepository evidences; private final UserRepository users;
    public EvidenceService(EvidenceSnapshotRepository evidences,UserRepository users){this.evidences=evidences;this.users=users;}
    public PageResponse<EvidenceResponse> search(Long studentId,Long subjectId,Instant from,Instant to,Long tagId,
            EvidenceSnapshot.Status status,Pageable pageable){
        User a=actor(); return PageResponse.from(evidences.findAll(
                EvidenceSpecifications.search(studentId,subjectId,from,to,tagId,status,a.getId(),
                        a.getRole()==User.Role.ADMIN),
                Pageables.sanitize(pageable, SORTABLE)).map(EvidenceResponse::from));
    }
    public EvidenceResponse find(Long id){
        EvidenceSnapshot e=evidences.findById(id).orElseThrow(()->new BusinessException(ErrorCode.EVIDENCE_NOT_FOUND));
        User a=actor(); if(a.getRole()!=User.Role.ADMIN&&!e.getObservation().getTeacher().getId().equals(a.getId()))
            throw new BusinessException(ErrorCode.EVIDENCE_ACCESS_DENIED);
        return EvidenceResponse.from(e);
    }
    private User actor(){String email=SecurityContextHolder.getContext().getAuthentication().getName();
        return users.findByEmail(User.normalizeEmail(email)).orElseThrow(()->new BusinessException(ErrorCode.USER_NOT_FOUND));}
}
