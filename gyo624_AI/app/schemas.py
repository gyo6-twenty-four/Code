import re
from typing import Annotated, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)
from pydantic.alias_generators import to_camel

from .fields import GROWTH_FIELDS, LESSON_FIELDS, STUDENT_FIELDS, TRAITS

ObservationText = Annotated[str, StringConstraints(max_length=2000)]


class APIModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="ignore")

    @field_validator("*", mode="before")
    @classmethod
    def normalize_text(cls, value):
        return value.replace("\r\n", "\n").strip() if isinstance(value, str) else value


class Lesson(APIModel):
    lesson_activities: ObservationText = ""
    project_topic: ObservationText = ""
    practice_assessment: ObservationText = ""
    presentation_discussion: ObservationText = ""
    assignments: ObservationText = ""


class StudentActivity(APIModel):
    role: ObservationText = ""
    actions: ObservationText = ""
    problem_solving: ObservationText = ""
    skills_knowledge: ObservationText = ""
    collaboration: ObservationText = ""
    difficulty_overcome: ObservationText = ""


class Growth(APIModel):
    new_knowledge: ObservationText = ""
    improvement: ObservationText = ""
    further_inquiry: ObservationText = ""
    potential: ObservationText = ""


class Standard(APIModel):
    code: str = Field(default="", max_length=40)
    category: str = Field(default="", max_length=80)
    content: str = Field(default="", max_length=2000)


class GenerationRequest(APIModel):
    mode: Literal["draft", "shorten"] = "draft"
    curriculum_name: str = Field(min_length=1, max_length=80)
    curriculum_year: int = 0
    school_level: Literal["middle", "high"]
    subject_name: str = Field(min_length=1, max_length=80)
    subject_type: str = Field(default="", max_length=40)
    standards: list[Standard] = Field(default_factory=list, max_length=12)
    lesson: Lesson = Field(default_factory=Lesson)
    student: StudentActivity = Field(default_factory=StudentActivity)
    growth: Growth = Field(default_factory=Growth)
    traits: list[str] = Field(default_factory=list, max_length=8)
    trait_note: ObservationText = ""
    teacher_request: str = Field(default="", max_length=1000)
    unit: Literal["characters", "bytes"] = "characters"
    target_length: int = Field(strict=True, ge=50, le=6000)
    previous_content: str = Field(default="", max_length=8000)
    include_sources: bool = False

    @model_validator(mode="after")
    def validate_facts(self):
        upper = 6000 if self.unit == "bytes" else 2000
        if self.target_length > upper:
            raise ValueError(f"분량은 50에서 {upper} 사이로 입력해 주세요.")
        if any(trait not in TRAITS for trait in self.traits):
            raise ValueError("학습 특성 선택을 확인해 주세요.")
        self.traits = list(dict.fromkeys(self.traits))
        self.standards = [item for item in self.standards if item.code and item.content]
        data = self.model_dump(by_alias=True)
        texts = []

        def collect(value):
            if isinstance(value, str):
                texts.append(value)
            elif isinstance(value, dict):
                for child in value.values():
                    collect(child)
            elif isinstance(value, list):
                for child in value:
                    collect(child)

        collect(data)
        joined = "\n".join(texts)
        if (
            re.search(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", joined, re.I)
            or re.search(r"01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}", joined)
            or re.search(r"\d{6}-[1-4]\d{6}", joined)
        ):
            raise ValueError("입력에 개인정보로 보이는 내용이 있어요. 지운 뒤 다시 시도해 주세요.")
        activity = [
            *self.lesson.model_dump().values(),
            *self.student.model_dump().values(),
            *self.growth.model_dump().values(),
            self.trait_note,
        ]
        if not any(len(text) >= 2 for text in activity):
            raise ValueError(
                "수업, 학생 활동, 성장 내용 중 하나를 입력해 주세요. 특성 키워드만으로는 생성할 수 없어요."
            )
        if self.mode == "shorten" and len(self.previous_content) < 2:
            raise ValueError("줄여 쓸 초안이 없어요.")
        return self

    def prompt_data(self) -> dict:
        return self.model_dump(by_alias=True, exclude={"include_sources"})


class Source(APIModel):
    field: str
    start: int
    text: str


class LinkedSentence(APIModel):
    text: str
    sources: list[Source]


class GenerationResponse(APIModel):
    content: str
    review_notes: list[str]
    sentences: list[LinkedSentence] | None = None
    count: int
    character_count: int
    byte_count: int
    unit: Literal["characters", "bytes"]
    target_length: int
    over_limit: bool
    provider: str


# Keep the supported observation fields explicit and discoverable for AI development.
SOURCE_GROUPS = (("lesson", LESSON_FIELDS), ("student", STUDENT_FIELDS), ("growth", GROWTH_FIELDS))
