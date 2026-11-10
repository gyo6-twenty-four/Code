package com.education24.controller;
import com.education24.dto.request.*;
import com.education24.dto.response.CatalogResponse;
import com.education24.service.CatalogService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1") @Tag(name="Catalog", description="기준정보")
@SecurityRequirement(name="bearerAuth")
public class CatalogController {
 private final CatalogService s; public CatalogController(CatalogService s){this.s=s;}
 @GetMapping("/subjects") List<CatalogResponse> subjects(){return s.subjects();}
 @PostMapping("/subjects") @PreAuthorize("hasRole('ADMIN')")
 ResponseEntity<CatalogResponse> createSubject(@Valid @RequestBody CatalogRequest r){return ResponseEntity.status(201).body(s.createSubject(r));}
 @PutMapping("/subjects/{id}") @PreAuthorize("hasRole('ADMIN')") CatalogResponse updateSubject(@PathVariable Long id,@Valid @RequestBody CatalogRequest r){return s.updateSubject(id,r);}
 @DeleteMapping("/subjects/{id}") @PreAuthorize("hasRole('ADMIN')") ResponseEntity<Void> deleteSubject(@PathVariable Long id){s.deleteSubject(id);return ResponseEntity.noContent().build();}
 @GetMapping("/activities") List<CatalogResponse> activities(){return s.activities();}
 @PostMapping("/activities") @PreAuthorize("hasRole('ADMIN')") ResponseEntity<CatalogResponse> createActivity(@Valid @RequestBody ActivityRequest r){return ResponseEntity.status(201).body(s.createActivity(r));}
 @PutMapping("/activities/{id}") @PreAuthorize("hasRole('ADMIN')") CatalogResponse updateActivity(@PathVariable Long id,@Valid @RequestBody ActivityRequest r){return s.updateActivity(id,r);}
 @DeleteMapping("/activities/{id}") @PreAuthorize("hasRole('ADMIN')") ResponseEntity<Void> deleteActivity(@PathVariable Long id){s.deleteActivity(id);return ResponseEntity.noContent().build();}
 @GetMapping("/tags") List<CatalogResponse> tags(){return s.tags();}
 @PostMapping("/tags") @PreAuthorize("hasRole('ADMIN')") ResponseEntity<CatalogResponse> createTag(@Valid @RequestBody CatalogRequest r){return ResponseEntity.status(201).body(s.createTag(r));}
 @PutMapping("/tags/{id}") @PreAuthorize("hasRole('ADMIN')") CatalogResponse updateTag(@PathVariable Long id,@Valid @RequestBody CatalogRequest r){return s.updateTag(id,r);}
 @DeleteMapping("/tags/{id}") @PreAuthorize("hasRole('ADMIN')") ResponseEntity<Void> deleteTag(@PathVariable Long id){s.deleteTag(id);return ResponseEntity.noContent().build();}
}
