package com.education24.controller;
import com.education24.dto.request.*;
import com.education24.dto.response.StudentResponse;
import com.education24.exception.ErrorResponse;
import com.education24.service.StudentService;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/students")
@Tag(name="Students", description="학생")
@SecurityRequirement(name="bearerAuth")
public class StudentController {
 private final StudentService service; public StudentController(StudentService service){this.service=service;}
 @PostMapping
 @ApiResponse(responseCode="409",content=@Content(schema=@Schema(implementation=ErrorResponse.class)))
 ResponseEntity<StudentResponse> create(@Valid @RequestBody StudentCreateRequest r){return ResponseEntity.status(HttpStatus.CREATED).body(service.create(r));}
 @GetMapping
 List<StudentResponse> all(){return service.findAll();}
 @GetMapping("/{id}")
 StudentResponse one(@PathVariable Long id){return service.find(id);}
 @PutMapping("/{id}")
 StudentResponse update(@PathVariable Long id,@Valid @RequestBody StudentUpdateRequest r){return service.update(id,r);}
 @DeleteMapping("/{id}")
 @ApiResponse(responseCode="409",content=@Content(schema=@Schema(implementation=ErrorResponse.class)))
 ResponseEntity<Void> delete(@PathVariable Long id){service.delete(id);return ResponseEntity.noContent().build();}
}
