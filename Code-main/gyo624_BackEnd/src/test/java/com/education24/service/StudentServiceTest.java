package com.education24.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.education24.domain.Student;
import com.education24.domain.User;
import com.education24.exception.*;
import com.education24.repository.*;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class StudentServiceTest {
    @Mock StudentRepository students;
    @Mock StudentIdentityRepository identities;
    @Mock ObservationRepository observations;
    @Mock EvidenceSnapshotRepository evidences;
    @Mock UserRepository users;
    @InjectMocks StudentService service;

    @BeforeEach void authenticate() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("teacher@test.dev", "x"));
        User actor = mock(User.class);
        when(actor.getSchoolCode()).thenReturn("SCHOOL1");
        lenient().when(users.findByEmail("teacher@test.dev")).thenReturn(Optional.of(actor));
    }

    @AfterEach void clear() { SecurityContextHolder.clearContext(); }

    @Test void deleteRejectsStudentWithObservations() {
        Student student = mock(Student.class);
        when(students.findByIdAndSchoolCode(1L, "SCHOOL1")).thenReturn(Optional.of(student));
        when(observations.existsByStudentId(1L)).thenReturn(true);
        assertThatThrownBy(() -> service.delete(1L))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.STUDENT_DELETE_CONFLICT));
        verify(students, never()).delete(any());
    }

    @Test void findMissingStudentReturnsDomainError() {
        when(students.findByIdAndSchoolCode(99L, "SCHOOL1")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.find(99L))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.STUDENT_NOT_FOUND));
    }

    @Test void cannotReadStudentFromAnotherSchool() {
        when(students.findByIdAndSchoolCode(7L, "SCHOOL1")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.find(7L))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.STUDENT_NOT_FOUND));
        verify(students, never()).findById(7L);
    }
}
