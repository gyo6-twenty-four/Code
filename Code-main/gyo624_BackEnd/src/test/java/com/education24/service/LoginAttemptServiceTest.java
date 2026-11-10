package com.education24.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.education24.exception.BusinessException;
import com.education24.exception.ErrorCode;
import org.junit.jupiter.api.Test;

class LoginAttemptServiceTest {
    @Test
    void blocksAnAccountAfterTenFailuresAndClearsOnSuccess() {
        LoginAttemptService service = new LoginAttemptService();
        String email = "teacher@example.test";

        for (int index = 0; index < LoginAttemptService.MAX_FAILURES; index++) {
            service.assertAllowed(email);
            service.recordFailure(email);
        }

        assertThatThrownBy(() -> service.assertAllowed(email))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        org.assertj.core.api.Assertions.assertThat(exception.getErrorCode())
                                .isEqualTo(ErrorCode.TOO_MANY_LOGIN_ATTEMPTS));

        service.recordSuccess(email);
        assertThatCode(() -> service.assertAllowed(email)).doesNotThrowAnyException();
    }
}
