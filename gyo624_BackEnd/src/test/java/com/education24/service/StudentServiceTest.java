package com.education24.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.education24.domain.Student;
import com.education24.exception.*;
import com.education24.repository.*;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class StudentServiceTest {
    @Mock StudentRepository students;
    @Mock StudentIdentityRepository identities;
    @Mock ObservationRepository observations;
    @Mock EvidenceSnapshotRepository evidences;
    @InjectMocks StudentService service;

    @Test void deleteRejectsStudentWithObservations() {
        Student student = mock(Student.class);
        when(students.findById(1L)).thenReturn(Optional.of(student));
        when(observations.existsByStudentId(1L)).thenReturn(true);
        assertThatThrownBy(() -> service.delete(1L))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.STUDENT_DELETE_CONFLICT));
        verify(students, never()).delete(any());
    }

    @Test void findMissingStudentReturnsDomainError() {
        when(students.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.find(99L))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.STUDENT_NOT_FOUND));
    }
}
