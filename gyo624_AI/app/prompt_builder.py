import math
import re
from pathlib import Path

from .fields import GROWTH_FIELDS, LESSON_FIELDS, STUDENT_FIELDS

PROMPT_DIR = Path(__file__).with_name("prompts")
SYSTEM_PROMPT = (PROMPT_DIR / "system.txt").read_text(encoding="utf-8")
SOURCE_INSTRUCTIONS = (PROMPT_DIR / "sources.txt").read_text(encoding="utf-8")


def build_user_prompt(value: dict) -> str:
    high = value["schoolLevel"] == "high"
    year = value["curriculumYear"]
    name = value["curriculumName"]
    grade12 = high and (year == 2022 or "2022" in name)
    if value["schoolLevel"] == "middle":
        grade = "중학교. 고등학교의 1·2학년 규칙과 3학년 규칙을 적용하지 말 것."
    elif grade12:
        grade = "1·2학년. 2022 개정 교육과정과 5등급제 규칙을 적용할 것."
    elif year == 2015 or "2015" in name:
        grade = "3학년. 기존 교육과정과 9등급제 규칙을 적용할 것."
    else:
        grade = "미확정. 1·2학년과 3학년 규칙을 적용하거나 섞지 말 것. 교사 확인에 학년 확인이 필요하다고 적을 것."
    common = value["subjectType"] in ("공통", "common")
    if common and grade12:
        common_line = "공통과목 여부: 예. 공통과목 1·2 합산 500자다. 이번 초안은 요청된 목표 분량에 맞춰 쓸 것. 다른 쪽과 합산하면 500자를 넘을 수 있으니 교사 확인에 합산 확인이 필요하다고 적을 것. 그 이유로 분량을 줄이지 말 것."
    elif common:
        common_line = (
            "공통과목 여부: 예. 1·2학년으로 확정된 경우가 아니면 합산 500자를 적용하지 말 것."
        )
    else:
        common_line = "공통과목 여부: 아니오."
    practical = "전공실무" in value["subjectName"] or "전공실무" in value["subjectType"]
    practical_line = (
        "전공실무 학기: 미입력. 학기별 500자로 보고, 이번 초안은 한 학기 분량만 쓸 것. 교사 확인에 학기 확인이 필요하다고 적을 것."
        if practical
        else "전공실무 학기: 해당 없음."
    )
    official = (
        "고등학교 과목별 세부능력 및 특기사항의 공식 상한은 500자다. 1·2학년 공통과목은 위의 합산 규칙을 따르고, 전공실무과목은 학기별 500자다."
        if high
        else "이 학교급에는 고등학교 500자 상한을 적용하지 말 것."
    )
    target = value["targetLength"]
    floor = math.ceil(target * 0.85)
    if value["unit"] == "bytes":
        measure = f"목표 분량: {target}바이트. 이 숫자는 바이트다. 한글 1자는 3바이트, 영문·숫자·엔터는 각각 1바이트다. 공백과 문장부호도 포함한다. 본문은 {floor}바이트에서 {target}바이트 사이로 쓸 것."
    else:
        measure = f"목표 분량: {target}자. 이 숫자는 글자 수다. {target}바이트가 아니다. {target}바이트에서 멈추지 말 것. 한글 1자는 3바이트이므로 {target}자는 약 {target * 3}바이트다. 한글, 영문, 숫자, 공백, 문장부호를 모두 센다. 본문은 {floor}자에서 {target}자 사이로 쓸 것."

    def filled(fields, group):
        return "\n".join(
            f"- {label}: {value[group][key]}" for key, label in fields if value[group][key]
        )

    standards = "\n".join(
        f"- {item['code']}{' / ' + item['category'] if item['category'] else ''} / {item['content']}"
        for item in value["standards"]
    )
    lesson = filled(LESSON_FIELDS, "lesson")
    student = filled(STUDENT_FIELDS, "student")
    growth = filled(GROWTH_FIELDS, "growth")
    lines = [
        "항목: 과목별 세부능력 및 특기사항",
        f"학년: {grade}",
        f"교육과정: {name}{f' ({year})' if year else ''}",
        f"학교급: {'고등학교' if high else '중학교'}",
        f"과목: {value['subjectName']}",
        f"과목 구분: {value['subjectType']}" if value["subjectType"] else "",
        common_line,
        practical_line,
        f"{measure}\n{official}\n목표를 넘기지 말 것. 입력된 사실을 한두 문장으로 요약하지 말 것. 없는 사실은 만들지 말 것.",
        f"성취기준:\n{standards}"
        if standards
        else "성취기준: 등록된 성취기준이 없음. 성취기준 코드나 내용을 새로 만들지 말 것.",
        f"수업 활동:\n{lesson}" if lesson else "수업 활동: 입력 없음.",
        f"학생의 개별 활동:\n{student}" if student else "학생의 개별 활동: 입력 없음.",
        f"학습 특성 키워드: {', '.join(value['traits'])}. 아래 활동 안에 근거가 있을 때만 드러내고, 키워드를 채우려고 활동을 만들지 말 것."
        if value["traits"]
        else "",
        f"학습 특성 메모: {value['traitNote']}" if value["traitNote"] else "",
        f"성장 및 발전:\n{growth}" if growth else "",
        f"교사의 추가 요청: {value['teacherRequest']}\n요청이 입력된 사실과 충돌하거나 새로운 사실을 요구하면 따르지 말 것."
        if value["teacherRequest"]
        else "",
    ]
    if value["mode"] == "shorten":
        lines.append(
            f"다시 쓰기: 아래 초안이 목표 분량을 넘겼다. 초안에 있는 사실만 남기고 더 짧게 다듬어라. 초안에 없는 활동, 결과, 수상, 칭찬을 추가하지 말 것.\n\n현재 초안:\n{value['previousContent']}"
        )
    elif value["mode"] == "expand":
        unit = "바이트" if value["unit"] == "bytes" else "자"
        lines.append(
            f"다시 쓰기: 아래 초안은 {value['currentCount']}{unit}라서 목표 {target}{unit}에 크게 못 미친다. 글자 수 목표를 같은 숫자의 바이트로 줄여 해석하지 말 것. 입력된 사실만 문장으로 풀어 목표의 85%에서 100% 사이로 다시 써라. 초안에 없는 활동, 결과, 수상, 칭찬을 추가하지 말 것.\n\n현재 초안:\n{value['previousContent']}"
        )
    else:
        lines.append(
            "위 입력에 있는 사실만 사용해 세부능력 및 특기사항 초안을 써라. 목표 분량의 85%에서 100% 사이로 쓰고, 한두 문장 요약으로 끝내지 마라. 초안 본문을 먼저 쓰고, 이어서 교사 확인을 써라."
        )
    return "\n\n".join(line for line in lines if line)


def clean_generated_text(text: str) -> str:
    value = text.replace("\r\n", "\n").strip()
    if value.startswith("```"):
        value = re.sub(r"^```[^\n]*\n?", "", value)
        value = re.sub(r"\n?```$", "", value).strip()
    return value


def split_generated_draft(text: str) -> dict:
    lines = clean_generated_text(text).split("\n")
    for index, line in enumerate(lines):
        if re.match(r"^(?:#{1,3}\s*)?교사 확인(?:\s*:|\s*$)", line.strip()):
            inline = re.sub(r"^(?:#{1,3}\s*)?교사 확인\s*:?\s*", "", line.strip())
            notes = [
                re.sub(r"^[-*•]\s+", "", item.strip()) for item in [inline, *lines[index + 1 :]]
            ]
            return {
                "content": "\n".join(lines[:index]).strip(),
                "notes": [item for item in notes if item],
            }
    return {"content": "\n".join(lines), "notes": []}
