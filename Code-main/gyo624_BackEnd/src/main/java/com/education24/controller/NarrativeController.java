package com.education24.controller;

import com.education24.dto.request.NarrativeRequest;
import com.education24.dto.response.NarrativeResponse;
import com.education24.dto.response.ValidationResponse;
import com.education24.service.NarrativeService;
import com.education24.service.ValidationService;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/narrative-drafts")
@Hidden
public class NarrativeController {
    private final NarrativeService narratives;
    private final ValidationService validations;

    public NarrativeController(NarrativeService narratives, ValidationService validations) {
        this.narratives = narratives;
        this.validations = validations;
    }

    @PostMapping("/generate")
    @PreAuthorize("hasRole('TEACHER')")
    ResponseEntity<NarrativeResponse> generate(@Valid @RequestBody NarrativeRequest.Generate request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(narratives.generate(request));
    }

    @GetMapping
    List<NarrativeResponse> findAll() {
        return narratives.findAll();
    }

    @GetMapping("/{draftId}")
    NarrativeResponse find(@PathVariable Long draftId) {
        return narratives.find(draftId);
    }

    @PatchMapping("/{draftId}/sentences/{sentenceId}")
    @PreAuthorize("hasRole('TEACHER')")
    NarrativeResponse edit(@PathVariable Long draftId, @PathVariable Long sentenceId,
            @Valid @RequestBody NarrativeRequest.EditSentence request) {
        return narratives.editSentence(draftId, sentenceId, request);
    }

    @PutMapping("/{draftId}/sentences/{sentenceId}/evidences")
    @PreAuthorize("hasRole('TEACHER')")
    NarrativeResponse replaceEvidences(@PathVariable Long draftId, @PathVariable Long sentenceId,
            @Valid @RequestBody NarrativeRequest.ReplaceEvidences request) {
        return narratives.replaceEvidences(draftId, sentenceId, request);
    }

    @PostMapping("/{draftId}/sentences/{sentenceId}/confirm-evidences")
    @PreAuthorize("hasRole('TEACHER')")
    NarrativeResponse confirmEvidences(@PathVariable Long draftId, @PathVariable Long sentenceId) {
        return narratives.confirmEvidences(draftId, sentenceId);
    }

    @GetMapping("/{draftId}/evidences/{evidenceId}/sentences")
    List<NarrativeResponse.Sentence> traceSentences(@PathVariable Long draftId, @PathVariable Long evidenceId) {
        return narratives.traceSentences(draftId, evidenceId);
    }

    @GetMapping("/by-evidence/{evidenceId}")
    List<NarrativeResponse> traceDrafts(@PathVariable Long evidenceId) {
        return narratives.traceDrafts(evidenceId);
    }

    @PostMapping("/{draftId}/validate")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    ValidationResponse validate(@PathVariable Long draftId) {
        return validations.validate(draftId);
    }

    @PostMapping("/{draftId}/finalize")
    @PreAuthorize("hasRole('TEACHER')")
    NarrativeResponse finalizeDraft(@PathVariable Long draftId) {
        return validations.finalizeDraft(draftId);
    }
}
