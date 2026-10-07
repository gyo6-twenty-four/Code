package com.education24.service;
import com.education24.domain.*;
import com.education24.dto.request.*;
import com.education24.dto.response.CatalogResponse;
import com.education24.exception.*;
import com.education24.repository.*;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @Transactional(readOnly = true)
public class CatalogService {
    private final SubjectRepository subjects; private final ActivityRepository activities; private final TagRepository tags;
    public CatalogService(SubjectRepository subjects, ActivityRepository activities, TagRepository tags) {
        this.subjects = subjects; this.activities = activities; this.tags = tags;
    }
    public List<CatalogResponse> subjects() { return subjects.findAll().stream().map(this::of).toList(); }
    public List<CatalogResponse> activities() { return activities.findAll().stream().map(this::of).toList(); }
    public List<CatalogResponse> tags() { return tags.findAll().stream().map(this::of).toList(); }
    @Transactional public CatalogResponse createSubject(CatalogRequest r) {
        if (subjects.existsByName(r.name())) duplicate(); return of(subjects.save(new Subject(r.name())));
    }
    @Transactional public CatalogResponse updateSubject(Long id, CatalogRequest r) {
        Subject s = subject(id);
        subjects.findByName(r.name()).filter(other -> !other.getId().equals(id)).ifPresent(other -> duplicate());
        s.update(r.name(), active(r.active())); return of(s);
    }
    @Transactional public void deleteSubject(Long id) { subjects.delete(subject(id)); }
    @Transactional public CatalogResponse createActivity(ActivityRequest r) {
        if (activities.existsBySubjectIdAndName(r.subjectId(), r.name())) duplicate();
        return of(activities.save(new Activity(subject(r.subjectId()), r.name())));
    }
    @Transactional public CatalogResponse updateActivity(Long id, ActivityRequest r) {
        Activity a = activity(id);
        activities.findBySubjectIdAndName(r.subjectId(), r.name()).filter(other -> !other.getId().equals(id))
                .ifPresent(other -> duplicate());
        a.update(subject(r.subjectId()), r.name(), active(r.active())); return of(a);
    }
    @Transactional public void deleteActivity(Long id) { activities.delete(activity(id)); }
    @Transactional public CatalogResponse createTag(CatalogRequest r) {
        if (tags.existsByName(r.name())) duplicate(); return of(tags.save(new Tag(r.name())));
    }
    @Transactional public CatalogResponse updateTag(Long id, CatalogRequest r) {
        Tag t = tag(id);
        tags.findByName(r.name()).filter(other -> !other.getId().equals(id)).ifPresent(other -> duplicate());
        t.update(r.name(), active(r.active())); return of(t);
    }
    @Transactional public void deleteTag(Long id) { tags.delete(tag(id)); }
    private boolean active(Boolean v) { return v == null || v; }
    private void duplicate() { throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE); }
    private Subject subject(Long id) { return subjects.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.SUBJECT_NOT_FOUND)); }
    private Activity activity(Long id) { return activities.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.ACTIVITY_NOT_FOUND)); }
    private Tag tag(Long id) { return tags.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.TAG_NOT_FOUND)); }
    private CatalogResponse of(Subject s) { return new CatalogResponse(s.getId(), null, s.getName(), s.isActive(), s.getCreatedAt(), s.getUpdatedAt()); }
    private CatalogResponse of(Activity a) { return new CatalogResponse(a.getId(), a.getSubject().getId(), a.getName(), a.isActive(), a.getCreatedAt(), a.getUpdatedAt()); }
    private CatalogResponse of(Tag t) { return new CatalogResponse(t.getId(), null, t.getName(), t.isActive(), t.getCreatedAt(), t.getUpdatedAt()); }
}
