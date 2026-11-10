package com.education24.controller;
import com.education24.domain.EvidenceSnapshot;
import com.education24.dto.response.*;
import com.education24.exception.ErrorResponse;
import com.education24.service.EvidenceService;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1") @Tag(name="Evidences", description="승인 근거")
@SecurityRequirement(name="bearerAuth")
public class EvidenceController {
 private final EvidenceService s; public EvidenceController(EvidenceService s){this.s=s;}
 @GetMapping("/evidences")
 PageResponse<EvidenceResponse> search(@RequestParam(required=false) Long studentId,@RequestParam(required=false) Long subjectId,
   @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) Instant from,
   @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) Instant to,
   @RequestParam(required=false) Long tagId,@RequestParam(required=false) EvidenceSnapshot.Status status,
   @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){
  return s.search(studentId,subjectId,from,to,tagId,status,pageable(page,size));
 }
 @GetMapping("/evidences/{id}")
 @ApiResponse(responseCode="403",content=@Content(schema=@Schema(implementation=ErrorResponse.class)))
 EvidenceResponse one(@PathVariable Long id){return s.find(id);}
 @GetMapping("/students/{studentId}/evidences")
 PageResponse<EvidenceResponse> student(@PathVariable Long studentId,@RequestParam(required=false) Long subjectId,
   @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) Instant from,
   @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) Instant to,
   @RequestParam(required=false) Long tagId,@RequestParam(required=false) EvidenceSnapshot.Status status,
   @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){
  return s.search(studentId,subjectId,from,to,tagId,status,pageable(page,size));
 }
 private static org.springframework.data.domain.Pageable pageable(int page,int size){
  return PageRequest.of(Math.max(page,0), size<1?20:Math.min(size,100), Sort.by("id"));
 }
}
