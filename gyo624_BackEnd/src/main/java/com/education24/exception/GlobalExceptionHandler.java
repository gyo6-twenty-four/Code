package com.education24.exception;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.InvalidDataAccessApiUsageException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    ResponseEntity<ErrorResponse> handleBusiness(
            BusinessException exception, HttpServletRequest request) {
        ErrorCode code = exception.getErrorCode();
        return ResponseEntity.status(code.status())
                .body(ErrorResponse.of(code, exception.getMessage(), request.getRequestURI()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException exception, HttpServletRequest request) {
        List<ErrorResponse.FieldError> errors = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> new ErrorResponse.FieldError(
                        error.getField(), error.getDefaultMessage()))
                .toList();
        ErrorCode code = ErrorCode.INVALID_REQUEST;
        return ResponseEntity.status(code.status()).body(new ErrorResponse(
                Instant.now(), code.name(), code.message(), request.getRequestURI(), errors));
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ErrorResponse> handleAccessDenied(
            AccessDeniedException exception, HttpServletRequest request) {
        ErrorCode code = ErrorCode.ACCESS_DENIED;
        return ResponseEntity.status(code.status())
                .body(ErrorResponse.of(code, code.message(), request.getRequestURI()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ErrorResponse> handleDataIntegrity(
            DataIntegrityViolationException exception, HttpServletRequest request) {
        ErrorCode code = ErrorCode.RESOURCE_IN_USE;
        return ResponseEntity.status(code.status())
                .body(ErrorResponse.of(code, code.message(), request.getRequestURI()));
    }

    @ExceptionHandler(InvalidDataAccessApiUsageException.class)
    ResponseEntity<ErrorResponse> handleInvalidDataAccess(
            InvalidDataAccessApiUsageException exception, HttpServletRequest request) {
        ErrorCode code = ErrorCode.INVALID_REQUEST;
        return ResponseEntity.status(code.status())
                .body(ErrorResponse.of(code, code.message(), request.getRequestURI()));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorResponse> handleUnexpected(
            Exception exception, HttpServletRequest request) {
        log.error("Unhandled exception", exception);
        ErrorCode code = ErrorCode.INTERNAL_SERVER_ERROR;
        return ResponseEntity.status(code.status())
                .body(ErrorResponse.of(code, code.message(), request.getRequestURI()));
    }
}
