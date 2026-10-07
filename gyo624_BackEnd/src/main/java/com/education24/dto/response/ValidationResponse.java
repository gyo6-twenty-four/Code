package com.education24.dto.response;
import com.education24.domain.ValidationResult;
import java.util.List;
public record ValidationResponse(boolean passed,List<Item> results){
 public static ValidationResponse from(List<ValidationResult> r){return new ValidationResponse(r.stream().allMatch(ValidationResult::isPassed),
  r.stream().map(v->new Item(v.getSentence()==null?null:v.getSentence().getId(),v.getRuleType(),v.isPassed(),v.getMessage())).toList());}
 public record Item(Long sentenceId,String ruleType,boolean passed,String message){}
}
