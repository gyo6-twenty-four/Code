package com.education24.service;

import com.education24.domain.EvidenceSnapshot;
import com.education24.domain.NarrativeDraft;
import com.education24.domain.NarrativeSentence;
import com.education24.domain.User;
import com.education24.dto.request.LlmGenerationRequest;
import com.education24.dto.request.NarrativeRequest;
import com.education24.dto.response.LlmGenerationResponse;
import com.education24.dto.response.NarrativeResponse;
import com.education24.exception.BusinessException;
import com.education24.exception.ErrorCode;
import com.education24.repository.EvidenceSnapshotRepository;
import com.education24.repository.NarrativeDraftRepository;
import com.education24.repository.NarrativeSentenceRepository;
import com.education24.repository.StudentRepository;
import com.education24.repository.UserRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class NarrativeService {
    private final NarrativeDraftRepository drafts;
    private final NarrativeSentenceRepository sentences;
    private final EvidenceSnapshotRepository evidences;
    private final StudentRepository students;
    private final UserRepository users;
    private final NarrativeGenerator generator;
    private final PrivacyAllowlistValidator privacy;
    private final AuditService audit;

    public NarrativeService(NarrativeDraftRepository drafts, NarrativeSentenceRepository sentences,
            EvidenceSnapshotRepository evidences, StudentRepository students, UserRepository users,
            NarrativeGenerator generator, PrivacyAllowlistValidator privacy, AuditService audit) {
        this.drafts = drafts;
        this.sentences = sentences;
        this.evidences = evidences;
        this.students = students;
        this.users = users;
        this.generator = generator;
        this.privacy = privacy;
        this.audit = audit;
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public NarrativeResponse generate(NarrativeRequest.Generate request) {
        User actor = actor();
        var student = students.findById(request.studentId())
                .orElseThrow(() -> new BusinessException(ErrorCode.STUDENT_NOT_FOUND));
        List<EvidenceSnapshot> selected = requireEvidences(request.evidenceIds(), student.getId(), actor);
        NarrativeDraft draft = drafts.saveAndFlush(new NarrativeDraft(student, actor));
        LlmGenerationRequest llmRequest = new LlmGenerationRequest(selected.stream()
                .map(e -> new LlmGenerationRequest.Evidence(student.getPseudonymId(), e.getId(), e.getContent(),
                        e.getSubject().getName(), e.getActivity().getName()))
                .toList());
        privacy.validate(llmRequest);
        try {
            LlmGenerationResponse generated = generator.generate(llmRequest);
            persistGenerated(draft, selected, generated);
            draft.generated(generated.provider(), generated.model(), generated.promptVersion());
            audit.record(actor, "NARRATIVE_GENERATED", "NARRATIVE_DRAFT", draft.getId(), "status=DRAFT");
            return NarrativeResponse.from(draft);
        } catch (BusinessException exception) {
            draft.generationFailed();
            drafts.saveAndFlush(draft);
            audit.record(actor, "NARRATIVE_GENERATION_FAILED", "NARRATIVE_DRAFT", draft.getId(),
                    "status=GENERATION_FAILED");
            throw exception;
        } catch (RuntimeException exception) {
            draft.generationFailed();
            drafts.saveAndFlush(draft);
            audit.record(actor, "NARRATIVE_GENERATION_FAILED", "NARRATIVE_DRAFT", draft.getId(),
                    "status=GENERATION_FAILED");
            throw new BusinessException(ErrorCode.LLM_GENERATION_FAILED);
        }
    }

    public List<NarrativeResponse> findAll() {
        User actor = actor();
        List<NarrativeDraft> result = actor.getRole() == User.Role.ADMIN
                ? drafts.findAllByOrderByCreatedAtDesc()
                : drafts.findAllByTeacherIdOrderByCreatedAtDesc(actor.getId());
        return result.stream().map(NarrativeResponse::from).toList();
    }

    public NarrativeResponse find(Long draftId) {
        return NarrativeResponse.from(ownedDraft(draftId, actor()));
    }

    @Transactional
    public NarrativeResponse editSentence(Long draftId, Long sentenceId, NarrativeRequest.EditSentence request) {
        User actor = actor();
        NarrativeSentence sentence = ownedSentence(draftId, sentenceId, actor);
        mutable(sentence.getDraft());
        sentence.edit(request.content());
        audit.record(actor, "NARRATIVE_SENTENCE_EDITED", "NARRATIVE_DRAFT", draftId,
                "status=NEEDS_REVALIDATION");
        return NarrativeResponse.from(sentence.getDraft());
    }

    @Transactional
    public NarrativeResponse replaceEvidences(Long draftId, Long sentenceId,
            NarrativeRequest.ReplaceEvidences request) {
        User actor = actor();
        NarrativeSentence sentence = ownedSentence(draftId, sentenceId, actor);
        mutable(sentence.getDraft());
        List<EvidenceSnapshot> replacements = requireEvidences(request.evidenceIds(),
                sentence.getDraft().getStudent().getId(), actor);
        sentence.replaceEvidences(Set.copyOf(replacements), false);
        audit.record(actor, "NARRATIVE_EVIDENCES_REPLACED", "NARRATIVE_DRAFT", draftId,
                "status=NEEDS_REVALIDATION");
        return NarrativeResponse.from(sentence.getDraft());
    }

    @Transactional
    public NarrativeResponse confirmEvidences(Long draftId, Long sentenceId) {
        User actor = actor();
        NarrativeSentence sentence = ownedSentence(draftId, sentenceId, actor);
        mutable(sentence.getDraft());
        if (sentence.getEvidences().isEmpty()) {
            throw new BusinessException(ErrorCode.EVIDENCE_REQUIRED);
        }
        sentence.confirmEvidences();
        audit.record(actor, "NARRATIVE_EVIDENCES_CONFIRMED", "NARRATIVE_DRAFT", draftId,
                "status=NEEDS_REVALIDATION");
        return NarrativeResponse.from(sentence.getDraft());
    }

    public List<NarrativeResponse.Sentence> traceSentences(Long draftId, Long evidenceId) {
        NarrativeDraft draft = ownedDraft(draftId, actor());
        return sentences.findByDraftAndEvidence(draft.getId(), evidenceId).stream()
                .map(NarrativeResponse.Sentence::from).toList();
    }

    public List<NarrativeResponse> traceDrafts(Long evidenceId) {
        User actor = actor();
        return drafts.findAllLinkedToEvidence(evidenceId).stream()
                .filter(d -> actor.getRole() == User.Role.ADMIN || d.getTeacher().getId().equals(actor.getId()))
                .map(NarrativeResponse::from).toList();
    }

    private void persistGenerated(NarrativeDraft draft, List<EvidenceSnapshot> selected,
            LlmGenerationResponse response) {
        if (response == null || response.sentences() == null || response.sentences().isEmpty()) {
            throw new BusinessException(ErrorCode.LLM_GENERATION_FAILED, "생성된 문장이 없습니다.");
        }
        Map<Long, EvidenceSnapshot> allowed = new LinkedHashMap<>();
        selected.forEach(e -> allowed.put(e.getId(), e));
        int sequence = 1;
        for (LlmGenerationResponse.Sentence generated : response.sentences()) {
            if (generated == null || generated.content() == null || generated.content().isBlank()
                    || generated.evidenceIds() == null || generated.evidenceIds().isEmpty()
                    || !allowed.keySet().containsAll(generated.evidenceIds())) {
                throw new BusinessException(ErrorCode.LLM_GENERATION_FAILED, "생성 결과의 문장-근거 연결이 올바르지 않습니다.");
            }
            NarrativeSentence sentence = sentences.saveAndFlush(
                    new NarrativeSentence(draft, sequence++, generated.content()));
            sentence.replaceEvidences(generated.evidenceIds().stream().map(allowed::get)
                    .collect(java.util.stream.Collectors.toSet()), true);
            draft.addSentence(sentence);
        }
    }

    private List<EvidenceSnapshot> requireEvidences(Set<Long> ids, Long studentId, User actor) {
        if (ids == null || ids.isEmpty()) {
            throw new BusinessException(ErrorCode.EVIDENCE_REQUIRED);
        }
        List<EvidenceSnapshot> result = evidences.findAllDetailByIdIn(ids);
        if (result.size() != ids.size()) {
            throw new BusinessException(ErrorCode.EVIDENCE_NOT_FOUND);
        }
        for (EvidenceSnapshot evidence : result) {
            if (!evidence.getStudent().getId().equals(studentId)) {
                throw new BusinessException(ErrorCode.EVIDENCE_STUDENT_MISMATCH);
            }
            if (evidence.getStatus() != EvidenceSnapshot.Status.ACTIVE) {
                throw new BusinessException(ErrorCode.EVIDENCE_NOT_APPROVED);
            }
            if (!evidence.getObservation().getTeacher().getId().equals(actor.getId())) {
                throw new BusinessException(ErrorCode.EVIDENCE_ACCESS_DENIED);
            }
        }
        return result;
    }

    private NarrativeSentence ownedSentence(Long draftId, Long sentenceId, User actor) {
        NarrativeSentence sentence = sentences.findDetail(sentenceId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SENTENCE_NOT_FOUND));
        if (!sentence.getDraft().getId().equals(draftId)) {
            throw new BusinessException(ErrorCode.SENTENCE_NOT_FOUND);
        }
        requireAccess(sentence.getDraft(), actor);
        return sentence;
    }

    private NarrativeDraft ownedDraft(Long id, User actor) {
        NarrativeDraft draft = drafts.findDetail(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.DRAFT_NOT_FOUND));
        requireAccess(draft, actor);
        return draft;
    }

    private void requireAccess(NarrativeDraft draft, User actor) {
        if (actor.getRole() != User.Role.ADMIN && !draft.getTeacher().getId().equals(actor.getId())) {
            throw new BusinessException(ErrorCode.DRAFT_ACCESS_DENIED);
        }
    }

    private void mutable(NarrativeDraft draft) {
        if (draft.getStatus() == NarrativeDraft.Status.FINALIZED
                || draft.getStatus() == NarrativeDraft.Status.GENERATING
                || draft.getStatus() == NarrativeDraft.Status.GENERATION_FAILED) {
            throw new BusinessException(ErrorCode.INVALID_DRAFT_STATUS);
        }
    }

    private User actor() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return users.findByEmail(User.normalizeEmail(email))
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }
}
