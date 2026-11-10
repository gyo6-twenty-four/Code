package com.education24.dto.response;
import com.education24.domain.*;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;
public record NarrativeResponse(
 Long id, Long studentId,
 @Schema(allowableValues={"GENERATING","DRAFT","VALID","VALIDATION_FAILED","NEEDS_REVALIDATION","FINALIZED","GENERATION_FAILED"}) NarrativeDraft.Status status,
 String validationStatus,String llmProvider,String llmModel,String promptVersion,
 List<Sentence> sentences,Instant createdAt,Instant updatedAt,Instant finalizedAt){
 public static NarrativeResponse from(NarrativeDraft d){return new NarrativeResponse(d.getId(),d.getStudent().getId(),d.getStatus(),
  d.getValidationStatus(),d.getLlmProvider(),d.getLlmModel(),d.getPromptVersion(),
  d.getSentences().stream().map(Sentence::from).toList(),d.getCreatedAt(),d.getUpdatedAt(),d.getFinalizedAt());}
 public record Sentence(Long id,int sequenceNumber,String originalContent,String editedContent,boolean editedByTeacher,
  boolean connectionConfirmed,List<EvidenceLink> evidences){
  public static Sentence from(NarrativeSentence s){return new Sentence(s.getId(),s.getSequenceNumber(),s.getOriginalContent(),
   s.getEditedContent(),s.isEditedByTeacher(),s.isConnectionConfirmed(),s.getEvidences().stream().map(EvidenceLink::from).toList());}
 }
 public record EvidenceLink(Long evidenceId,boolean suggestedByLlm,boolean confirmedByTeacher,Instant confirmedAt){
  static EvidenceLink from(SentenceEvidence e){return new EvidenceLink(e.getEvidence().getId(),e.isSuggestedByLlm(),e.isConfirmedByTeacher(),e.getConfirmedAt());}
 }
}
