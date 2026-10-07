package com.education24.dto.response;
import com.education24.domain.Student;
import com.education24.domain.StudentIdentity;
import java.time.Instant;
public record StudentResponse(Long id, String pseudonymId,
        String realName,
        String internalIdentifier,
        Instant createdAt, Instant updatedAt) {
    public static StudentResponse of(Student s, StudentIdentity i) {
        return new StudentResponse(s.getId(), s.getPseudonymId(), i.getRealName(),
                i.getInternalIdentifier(), s.getCreatedAt(), s.getUpdatedAt());
    }
}
