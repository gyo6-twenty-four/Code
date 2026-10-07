package com.education24.service;

import com.education24.domain.*;
import com.education24.domain.Observation.Status;
import com.education24.domain.ObservationApprovalHistory.Action;
import com.education24.dto.request.*;
import com.education24.dto.response.ObservationResponse;
import com.education24.exception.*;
import com.education24.repository.*;
import java.util.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @Transactional(readOnly = true)
public class ObservationService {
    private final ObservationRepository observations; private final ObservationRevisionRepository revisions;
    private final ObservationApprovalHistoryRepository histories; private final EvidenceSnapshotRepository evidences;
    private final StudentRepository students; private final UserRepository users; private final SubjectRepository subjects;
    private final ActivityRepository activities; private final TagRepository tags; private final EvidenceImpactService impacts;
    public ObservationService(ObservationRepository observations, ObservationRevisionRepository revisions,
            ObservationApprovalHistoryRepository histories, EvidenceSnapshotRepository evidences,
            StudentRepository students, UserRepository users, SubjectRepository subjects,
            ActivityRepository activities, TagRepository tags, EvidenceImpactService impacts) {
        this.observations=observations; this.revisions=revisions; this.histories=histories; this.evidences=evidences;
        this.students=students; this.users=users; this.subjects=subjects; this.activities=activities; this.tags=tags; this.impacts=impacts;
    }
    @Transactional public ObservationResponse create(ObservationRequest r) {
        User actor=actor(); Parts p=parts(r); Observation o=observations.save(new Observation(p.student, actor, p.subject,
                p.activity, r.content(), r.observedAt(), p.tags));
        revisions.save(revision(o, actor)); return ObservationResponse.from(o);
    }
    public List<ObservationResponse> findAll() {
        User a=actor(); return observations.findAll().stream()
                .filter(o -> a.getRole()==User.Role.ADMIN || o.getTeacher().getId().equals(a.getId()))
                .map(ObservationResponse::from).toList();
    }
    public ObservationResponse find(Long id) { Observation o=observation(id); canView(o, actor()); return ObservationResponse.from(o); }
    @Transactional public ObservationResponse update(Long id, ObservationRequest r) {
        User a=actor(); Observation o=owned(id,a); require(o, Status.DRAFT, Status.REJECTED); Parts p=parts(r);
        o.update(p.student,p.subject,p.activity,r.content(),r.observedAt(),p.tags);
        revisions.save(revision(o,a)); return ObservationResponse.from(o);
    }
    @Transactional public void delete(Long id) {
        Observation o=owned(id,actor()); require(o,Status.DRAFT,Status.REJECTED); observations.delete(o);
    }
    @Transactional public ObservationResponse submit(Long id) {
        User a=actor(); Observation o=owned(id,a); require(o,Status.DRAFT); o.submit(); history(o,Action.SUBMITTED,a,null);
        return ObservationResponse.from(o);
    }
    @Transactional public ObservationResponse approve(Long id) {
        User a=actor(); Observation o=owned(id,a); require(o,Status.IN_REVIEW); o.approve();
        ObservationRevision rev=revisions.findTopByObservationIdOrderByRevisionNumberDesc(id).orElseThrow();
        evidences.save(new EvidenceSnapshot(o,rev,a)); history(o,Action.APPROVED,a,null); return ObservationResponse.from(o);
    }
    @Transactional public ObservationResponse reject(Long id, ObservationReasonRequest r) {
        User a=actor(); Observation o=owned(id,a); require(o,Status.IN_REVIEW); o.reject(r.reason());
        history(o,Action.REJECTED,a,r.reason()); return ObservationResponse.from(o);
    }
    @Transactional public ObservationResponse revoke(Long id, ObservationReasonRequest r) {
        User a=actor(); Observation o=owned(id,a); require(o,Status.APPROVED);
        EvidenceSnapshot e=evidences.findByObservationIdAndStatus(id,EvidenceSnapshot.Status.ACTIVE)
                .orElseThrow(() -> new BusinessException(ErrorCode.EVIDENCE_NOT_FOUND));
        e.revoke(); o.revoke(); history(o,Action.REVOKED,a,r.reason()); impacts.evidenceRevoked(e.getId(),o.getStudent().getId());
        return ObservationResponse.from(o);
    }
    private ObservationRevision revision(Observation o,User a) {
        return new ObservationRevision(o,(int)revisions.countByObservationId(o.getId())+1,o.getContent(),
                o.getSubject(),o.getActivity(),o.getObservedAt(),a);
    }
    private void history(Observation o,Action action,User a,String reason) { histories.save(new ObservationApprovalHistory(o,action,a,reason)); }
    private Parts parts(ObservationRequest r) {
        Student s=students.findById(r.studentId()).orElseThrow(() -> new BusinessException(ErrorCode.STUDENT_NOT_FOUND));
        Subject sub=subjects.findById(r.subjectId()).orElseThrow(() -> new BusinessException(ErrorCode.SUBJECT_NOT_FOUND));
        Activity act=activities.findById(r.activityId()).orElseThrow(() -> new BusinessException(ErrorCode.ACTIVITY_NOT_FOUND));
        if(!act.getSubject().getId().equals(sub.getId())) throw new BusinessException(ErrorCode.SUBJECT_ACTIVITY_MISMATCH);
        Set<Long> ids=r.tagIds()==null?Set.of():r.tagIds(); Set<Tag> found=tags.findAllByIdIn(ids);
        if(found.size()!=ids.size()) throw new BusinessException(ErrorCode.TAG_NOT_FOUND);
        if(!sub.isActive()||!act.isActive()||found.stream().anyMatch(t->!t.isActive()))
            throw new BusinessException(ErrorCode.INVALID_REQUEST,"비활성 과목·활동·태그는 사용할 수 없습니다.");
        return new Parts(s,sub,act,found);
    }
    private User actor() {
        String email=SecurityContextHolder.getContext().getAuthentication().getName();
        return users.findByEmail(User.normalizeEmail(email)).orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }
    private Observation observation(Long id) { return observations.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.OBSERVATION_NOT_FOUND)); }
    private Observation owned(Long id,User a) { Observation o=observation(id); if(!o.getTeacher().getId().equals(a.getId())) throw new BusinessException(ErrorCode.OBSERVATION_ACCESS_DENIED); return o; }
    private void canView(Observation o,User a) { if(a.getRole()!=User.Role.ADMIN&&!o.getTeacher().getId().equals(a.getId())) throw new BusinessException(ErrorCode.OBSERVATION_ACCESS_DENIED); }
    private void require(Observation o,Status... allowed) { if(Arrays.stream(allowed).noneMatch(s->s==o.getStatus())) throw new BusinessException(ErrorCode.INVALID_OBSERVATION_STATUS); }
    private record Parts(Student student,Subject subject,Activity activity,Set<Tag> tags){}
}
