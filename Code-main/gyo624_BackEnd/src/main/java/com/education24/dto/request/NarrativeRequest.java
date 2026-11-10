package com.education24.dto.request;

import jakarta.validation.constraints.*;
import java.util.Set;

public final class NarrativeRequest {
 private NarrativeRequest(){}
 public record Generate(@NotNull Long studentId,
   @NotEmpty Set<@NotNull Long> evidenceIds){}
 public record EditSentence(@NotBlank @Size(max=10000) String content){}
 public record ReplaceEvidences(@NotEmpty Set<@NotNull Long> evidenceIds){}
}
