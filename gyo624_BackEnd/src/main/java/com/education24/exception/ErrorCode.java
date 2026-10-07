package com.education24.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "요청 값이 올바르지 않습니다."),
    AUTHENTICATION_REQUIRED(HttpStatus.UNAUTHORIZED, "인증이 필요합니다."),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다."),
    EXPIRED_TOKEN(HttpStatus.UNAUTHORIZED, "만료된 토큰입니다."),
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "접근 권한이 없습니다."),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."),
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다."),
    USER_INACTIVE(HttpStatus.FORBIDDEN, "활성 상태가 아닌 사용자입니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다."),
    STUDENT_NOT_FOUND(HttpStatus.NOT_FOUND, "학생을 찾을 수 없습니다."),
    SUBJECT_NOT_FOUND(HttpStatus.NOT_FOUND, "과목을 찾을 수 없습니다."),
    ACTIVITY_NOT_FOUND(HttpStatus.NOT_FOUND, "활동을 찾을 수 없습니다."),
    TAG_NOT_FOUND(HttpStatus.NOT_FOUND, "태그를 찾을 수 없습니다."),
    EVIDENCE_NOT_FOUND(HttpStatus.NOT_FOUND, "근거 스냅샷을 찾을 수 없습니다."),
    DUPLICATE_RESOURCE(HttpStatus.CONFLICT, "중복된 리소스입니다."),
    RESOURCE_IN_USE(HttpStatus.CONFLICT, "다른 데이터에서 참조 중인 리소스입니다."),
    STUDENT_DELETE_CONFLICT(HttpStatus.CONFLICT, "관련 데이터가 있는 학생은 삭제할 수 없습니다."),
    SUBJECT_ACTIVITY_MISMATCH(HttpStatus.BAD_REQUEST, "활동이 선택한 과목에 속하지 않습니다."),
    OBSERVATION_ACCESS_DENIED(HttpStatus.FORBIDDEN, "관찰 기록 작성자만 처리할 수 있습니다."),
    OBSERVATION_NOT_FOUND(HttpStatus.NOT_FOUND, "관찰 기록을 찾을 수 없습니다."),
    INVALID_OBSERVATION_STATUS(HttpStatus.CONFLICT, "현재 관찰 기록 상태에서는 요청을 처리할 수 없습니다."),
    EVIDENCE_REQUIRED(HttpStatus.BAD_REQUEST, "하나 이상의 승인 근거가 필요합니다."),
    EVIDENCE_NOT_APPROVED(HttpStatus.CONFLICT, "승인되지 않은 근거가 포함되어 있습니다."),
    EVIDENCE_ACCESS_DENIED(HttpStatus.FORBIDDEN, "근거에 접근할 수 없습니다."),
    EVIDENCE_STUDENT_MISMATCH(HttpStatus.BAD_REQUEST, "서로 다른 학생의 근거가 포함되어 있습니다."),
    DRAFT_NOT_FOUND(HttpStatus.NOT_FOUND, "서술 초안을 찾을 수 없습니다."),
    SENTENCE_NOT_FOUND(HttpStatus.NOT_FOUND, "서술 문장을 찾을 수 없습니다."),
    DRAFT_ACCESS_DENIED(HttpStatus.FORBIDDEN, "서술 초안 작성 교사만 처리할 수 있습니다."),
    INVALID_DRAFT_STATUS(HttpStatus.CONFLICT, "현재 서술 초안 상태에서는 요청을 처리할 수 없습니다."),
    DRAFT_NEEDS_REVALIDATION(HttpStatus.CONFLICT, "초안 재검증이 필요합니다."),
    EVIDENCE_CONFIRMATION_REQUIRED(HttpStatus.CONFLICT, "문장과 근거의 연결 확인이 필요합니다."),
    CHARACTER_LIMIT_EXCEEDED(HttpStatus.UNPROCESSABLE_CONTENT, "글자 수 제한을 초과했습니다."),
    PROHIBITED_EXPRESSION_FOUND(HttpStatus.UNPROCESSABLE_CONTENT, "금지 표현이 포함되어 있습니다."),
    VALIDATION_POLICY_NOT_FOUND(HttpStatus.NOT_FOUND, "검증 정책을 찾을 수 없습니다."),
    PROHIBITED_EXPRESSION_NOT_FOUND(HttpStatus.NOT_FOUND, "금지 표현 정책을 찾을 수 없습니다."),
    INVALID_POLICY_VALUE(HttpStatus.BAD_REQUEST, "검증 정책 값이 올바르지 않습니다."),
    INVALID_REGULAR_EXPRESSION(HttpStatus.BAD_REQUEST, "유효하지 않은 정규식입니다."),
    PRIVACY_FIELD_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "LLM 전송 허용목록 밖의 필드가 포함되었습니다."),
    LLM_GENERATOR_NOT_CONFIGURED(HttpStatus.SERVICE_UNAVAILABLE, "서술 생성기가 구성되지 않았습니다."),
    FINALIZATION_BLOCKED(HttpStatus.CONFLICT, "검증 실패로 최종 확정할 수 없습니다."),
    LLM_GENERATION_FAILED(HttpStatus.BAD_GATEWAY, "서술 초안 생성에 실패했습니다.");

    private final HttpStatus status;
    private final String message;

    ErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }

    public HttpStatus status() { return status; }
    public String message() { return message; }
}
