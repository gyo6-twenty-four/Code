LESSON_FIELDS = (
    ("lessonActivities", "수업에서 진행한 활동"),
    ("projectTopic", "프로젝트 및 탐구 주제"),
    ("practiceAssessment", "실습 및 수행평가 내용"),
    ("presentationDiscussion", "발표 및 토론 내용"),
    ("assignments", "학생이 수행한 과제"),
)
STUDENT_FIELDS = (
    ("role", "학생이 맡은 역할"),
    ("actions", "학생이 직접 수행한 행동"),
    ("problemSolving", "문제를 해결한 과정"),
    ("skillsKnowledge", "사용한 기술 및 지식"),
    ("collaboration", "협업 및 의사소통 과정"),
    ("difficultyOvercome", "어려움을 극복한 경험"),
)
GROWTH_FIELDS = (
    ("newKnowledge", "수업을 통해 새롭게 습득한 지식"),
    ("improvement", "이전보다 발전한 부분"),
    ("furtherInquiry", "추가적인 탐구 활동"),
    ("potential", "향후 발전 가능성"),
)
TRAITS = {
    "자기주도적 학습",
    "창의적 문제 해결",
    "비판적 사고",
    "논리적 사고",
    "협업 능력",
    "의사소통 능력",
    "탐구 능력",
    "전공 관련 역량",
}


def count_units(text: str, unit: str = "characters") -> int:
    return len(text.encode("utf-8")) if unit == "bytes" else len(text)


def utf16_length(text: str) -> int:
    """Source offsets are consumed by JavaScript String.slice(), not Python slicing."""
    return len(text.encode("utf-16-le")) // 2
