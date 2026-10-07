package com.education24.controller;
import com.education24.dto.request.*;
import com.education24.dto.response.ObservationResponse;
import com.education24.exception.ErrorResponse;
import com.education24.service.ObservationService;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/observations")
@Tag(name="Observations", description="관찰 기록")
@SecurityRequirement(name="bearerAuth")
public class ObservationController {
 private final ObservationService s; public ObservationController(ObservationService s){this.s=s;}
 @PostMapping @PreAuthorize("hasRole('TEACHER')")
 ResponseEntity<ObservationResponse> create(@Valid @RequestBody ObservationRequest r){return ResponseEntity.status(201).body(s.create(r));}
 @GetMapping List<ObservationResponse> all(){return s.findAll();}
 @GetMapping("/{id}") ObservationResponse one(@PathVariable Long id){return s.find(id);}
 @PutMapping("/{id}") @PreAuthorize("hasRole('TEACHER')")
 ObservationResponse update(@PathVariable Long id,@Valid @RequestBody ObservationRequest r){return s.update(id,r);}
 @DeleteMapping("/{id}") @PreAuthorize("hasRole('TEACHER')") ResponseEntity<Void> delete(@PathVariable Long id){s.delete(id);return ResponseEntity.noContent().build();}
 @PostMapping("/{id}/submit") @PreAuthorize("hasRole('TEACHER')") ObservationResponse submit(@PathVariable Long id){return s.submit(id);}
 @PostMapping("/{id}/approve") @PreAuthorize("hasRole('TEACHER')")
 @ApiResponse(responseCode="409",content=@Content(schema=@Schema(implementation=ErrorResponse.class)))
 ObservationResponse approve(@PathVariable Long id){return s.approve(id);}
 @PostMapping("/{id}/reject") @PreAuthorize("hasRole('TEACHER')")
 ObservationResponse reject(@PathVariable Long id,@Valid @RequestBody ObservationReasonRequest r){return s.reject(id,r);}
 @PostMapping("/{id}/revoke") @PreAuthorize("hasRole('TEACHER')")
 ObservationResponse revoke(@PathVariable Long id,@Valid @RequestBody ObservationReasonRequest r){return s.revoke(id,r);}
}
