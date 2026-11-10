package com.education24.controller;

import com.education24.dto.request.ProhibitedExpressionRequest;
import com.education24.dto.request.ValidationPolicyRequest;
import com.education24.dto.response.PolicyResponse;
import com.education24.exception.ErrorResponse;
import com.education24.service.PolicyService;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Policies", description = "관리자 검증 정책")
@SecurityRequirement(name = "bearerAuth")
public class AdminPolicyController {
    private final PolicyService service;

    public AdminPolicyController(PolicyService service) {
        this.service = service;
    }

    @GetMapping("/validation-policies")
    List<PolicyResponse.ValidationPolicyItem> policies() { return service.policies(); }

    @GetMapping("/validation-policies/{id}")
    PolicyResponse.ValidationPolicyItem policy(@PathVariable Long id) { return service.policy(id); }

    @PostMapping("/validation-policies")
    ResponseEntity<PolicyResponse.ValidationPolicyItem> createPolicy(
            @Valid @RequestBody ValidationPolicyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PutMapping("/validation-policies/{id}")
    PolicyResponse.ValidationPolicyItem updatePolicy(@PathVariable Long id,
            @Valid @RequestBody ValidationPolicyRequest request) { return service.update(id, request); }

    @DeleteMapping("/validation-policies/{id}")
    ResponseEntity<Void> deletePolicy(@PathVariable Long id) {
        service.deletePolicy(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/prohibited-expressions")
    List<PolicyResponse.ProhibitedExpressionItem> expressions() { return service.expressions(); }

    @GetMapping("/prohibited-expressions/{id}")
    PolicyResponse.ProhibitedExpressionItem expression(@PathVariable Long id) { return service.expression(id); }

    @PostMapping("/prohibited-expressions")
    @ApiResponse(responseCode = "400",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    ResponseEntity<PolicyResponse.ProhibitedExpressionItem> createExpression(
            @Valid @RequestBody ProhibitedExpressionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PutMapping("/prohibited-expressions/{id}")
    PolicyResponse.ProhibitedExpressionItem updateExpression(@PathVariable Long id,
            @Valid @RequestBody ProhibitedExpressionRequest request) { return service.update(id, request); }

    @DeleteMapping("/prohibited-expressions/{id}")
    ResponseEntity<Void> deleteExpression(@PathVariable Long id) {
        service.deleteExpression(id);
        return ResponseEntity.noContent().build();
    }
}
