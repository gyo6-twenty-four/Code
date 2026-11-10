package com.education24.dto.request;
import com.education24.domain.ProhibitedExpression;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
public record ProhibitedExpressionRequest(
 @NotBlank @Size(max=500) String expression,
 @NotNull @Schema(allowableValues={"EXACT","CONTAINS","REGEX"}) ProhibitedExpression.MatchType matchType,
 @Size(max=1000) String description,
 boolean active){}
