package com.education24.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.education24.domain.EvidenceSnapshot;
import com.education24.domain.Student;
import com.education24.domain.User;
import com.education24.exception.BusinessException;
import com.education24.exception.ErrorCode;
import com.education24.repository.EvidenceSnapshotRepository;
import com.education24.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class EvidenceServiceTest {
    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void adminCannotReadEvidenceFromAnotherSchool() {
        EvidenceSnapshotRepository evidences = mock(EvidenceSnapshotRepository.class);
        UserRepository users = mock(UserRepository.class);
        EvidenceService service = new EvidenceService(evidences, users);
        User admin = mock(User.class);
        Student student = mock(Student.class);
        EvidenceSnapshot evidence = mock(EvidenceSnapshot.class);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("admin@test.dev", "x"));
        when(users.findByEmail("admin@test.dev")).thenReturn(Optional.of(admin));
        when(admin.getRole()).thenReturn(User.Role.ADMIN);
        when(admin.getSchoolCode()).thenReturn("SCHOOL1");
        when(evidences.findById(7L)).thenReturn(Optional.of(evidence));
        when(evidence.getStudent()).thenReturn(student);
        when(student.getSchoolCode()).thenReturn("SCHOOL2");

        assertThatThrownBy(() -> service.find(7L))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getErrorCode())
                                .isEqualTo(ErrorCode.EVIDENCE_ACCESS_DENIED));
    }
}
