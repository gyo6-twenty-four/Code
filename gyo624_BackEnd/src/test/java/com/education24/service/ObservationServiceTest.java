package com.education24.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.education24.domain.*;
import com.education24.dto.request.ObservationRequest;
import com.education24.exception.*;
import com.education24.repository.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class ObservationServiceTest {
 @Mock ObservationRepository observations; @Mock ObservationRevisionRepository revisions;
 @Mock ObservationApprovalHistoryRepository histories; @Mock EvidenceSnapshotRepository evidences;
 @Mock StudentRepository students; @Mock UserRepository users; @Mock SubjectRepository subjects;
 @Mock ActivityRepository activities; @Mock TagRepository tags; @Mock EvidenceImpactService impacts;
 @InjectMocks ObservationService service;

 @BeforeEach void authenticate(){
  SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("teacher@test.dev","x"));
 }
 @AfterEach void clear(){SecurityContextHolder.clearContext();}

 @Test void createRejectsActivityFromAnotherSubject(){
  User actor=mock(User.class); Student student=mock(Student.class); Subject selected=mock(Subject.class);
  Subject actual=mock(Subject.class); Activity activity=mock(Activity.class);
  when(users.findByEmail("teacher@test.dev")).thenReturn(Optional.of(actor));
  when(students.findById(1L)).thenReturn(Optional.of(student)); when(subjects.findById(2L)).thenReturn(Optional.of(selected));
  when(activities.findById(3L)).thenReturn(Optional.of(activity)); when(activity.getSubject()).thenReturn(actual);
  when(selected.getId()).thenReturn(2L); when(actual.getId()).thenReturn(9L);
  ObservationRequest request=new ObservationRequest(1L,2L,3L,"관찰",Instant.now(),Set.of());
  assertThatThrownBy(()->service.create(request)).isInstanceOfSatisfying(BusinessException.class,
    e->assertThat(e.getErrorCode()).isEqualTo(ErrorCode.SUBJECT_ACTIVITY_MISMATCH));
 }

 @Test void approvedObservationCannotBeSubmittedAgain(){
  User actor=mock(User.class); Observation observation=mock(Observation.class);
  when(actor.getId()).thenReturn(1L); when(users.findByEmail("teacher@test.dev")).thenReturn(Optional.of(actor));
  when(observations.findById(7L)).thenReturn(Optional.of(observation)); when(observation.getTeacher()).thenReturn(actor);
  when(observation.getStatus()).thenReturn(Observation.Status.APPROVED);
  assertThatThrownBy(()->service.submit(7L)).isInstanceOfSatisfying(BusinessException.class,
    e->assertThat(e.getErrorCode()).isEqualTo(ErrorCode.INVALID_OBSERVATION_STATUS));
  verify(observation,never()).submit();
 }
}
