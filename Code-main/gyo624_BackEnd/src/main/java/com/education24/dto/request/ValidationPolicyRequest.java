package com.education24.dto.request;
import com.education24.domain.ValidationPolicy;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
public record ValidationPolicyRequest(
 @NotNull @Schema(allowableValues={"CHARACTER_LIMIT"}) ValidationPolicy.PolicyType policyType,
 @NotNull @Schema(allowableValues={"DRAFT","SENTENCE"}) ValidationPolicy.TargetType targetType,
 @NotBlank @Size(max=1000) String policyValue,
 @NotNull @Schema(allowableValues={"ERROR","WARNING"}) ValidationPolicy.Severity severity,
 boolean active){}
