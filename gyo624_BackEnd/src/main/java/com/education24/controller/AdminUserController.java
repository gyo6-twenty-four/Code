package com.education24.controller;

import com.education24.dto.request.UserCreateRequest;
import com.education24.dto.request.UserUpdateRequest;
import com.education24.dto.response.PageResponse;
import com.education24.dto.response.UserResponse;
import com.education24.exception.ErrorResponse;
import com.education24.service.UserService;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/users")
@Tag(name = "Admin Users", description = "관리자 사용자")
@SecurityRequirement(name = "bearerAuth")
public class AdminUserController {
    private final UserService userService;

    public AdminUserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping
    @ApiResponse(responseCode = "409",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    ResponseEntity<UserResponse> create(@Valid @RequestBody UserCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.create(request));
    }

    @GetMapping
    PageResponse<UserResponse> findAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return userService.findAll(PageRequest.of(Math.max(page, 0),
                size < 1 ? 20 : Math.min(size, 100), Sort.by("id")));
    }

    @GetMapping("/{userId}")
    UserResponse find(@PathVariable Long userId) {
        return userService.find(userId);
    }

    @PatchMapping("/{userId}")
    UserResponse update(@PathVariable Long userId,
            @Valid @RequestBody UserUpdateRequest request) {
        return userService.update(userId, request);
    }

    @DeleteMapping("/{userId}")
    ResponseEntity<Void> delete(@PathVariable Long userId) {
        userService.delete(userId);
        return ResponseEntity.noContent().build();
    }
}
