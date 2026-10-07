package com.education24.dto.response;
import com.education24.domain.*;
import java.time.Instant;
public final class PolicyResponse {
 private PolicyResponse(){}
 public record ValidationPolicyItem(Long id,ValidationPolicy.PolicyType policyType,
  ValidationPolicy.TargetType targetType,String policyValue,ValidationPolicy.Severity severity,boolean active,
  Long createdBy,Instant createdAt,Instant updatedAt){
  public static ValidationPolicyItem from(ValidationPolicy p){return new ValidationPolicyItem(p.getId(),p.getPolicyType(),p.getTargetType(),p.getPolicyValue(),p.getSeverity(),p.isActive(),p.getCreatedById(),p.getCreatedAt(),p.getUpdatedAt());}
 }
 public record ProhibitedExpressionItem(Long id,String expression,
  ProhibitedExpression.MatchType matchType,String description,boolean active,Long createdBy,Instant createdAt,Instant updatedAt){
  public static ProhibitedExpressionItem from(ProhibitedExpression p){return new ProhibitedExpressionItem(p.getId(),p.getExpression(),p.getMatchType(),p.getDescription(),p.isActive(),p.getCreatedById(),p.getCreatedAt(),p.getUpdatedAt());}
 }
}
