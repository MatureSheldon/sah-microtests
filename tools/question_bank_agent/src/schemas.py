"""Pydantic models for SAH question-bank jobs, direction plans, and question rows."""

from __future__ import annotations

from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from model_policy import ModelPreferences

# Exact column order for the Questions sheet (must match SKILL.md / Apps Script).
SAH_HEADERS: list[str] = [
    "Question ID",
    "Class",
    "Subject",
    "Chapter No.",
    "Chapter",
    "Topic",
    "Subtopic",
    "Difficulty",
    "Question Type",
    "Question Style",
    "Marks",
    "Question",
    "Option A",
    "Option B",
    "Option C",
    "Option D",
    "Correct Answer",
    "Answer / Solution",
    "Explanation",
    "Learning Outcome",
    "NCERT Reference",
    "Source Type",
    "PYQ Year",
    "PYQ Board/Exam",
    "PYQ Paper/Set",
    "Use in Papers",
    "Times Asked",
    "Last Asked Date",
    "Last Paper ID",
    "Last Updated",
    "Notes",
    "Image URL",
    "Asset Format",
    "Asset Data",
    "Asset Placement",
    "Asset Width",
    "Asset Height",
]

QUESTION_TYPE_ORDER: list[str] = [
    "MCQ",
    "Assertion-Reason",
    "Very Short Answer",
    "Short Answer",
    "Case/Source-Based",
    "Long Answer",
]

ALLOWED_USE_IN_PAPERS = {"Yes", "Review", "No", ""}

ALLOWED_ASSET_FORMATS = {
    "",
    "png",
    "jpg",
    "jpeg",
    "svg",
    "mermaid",
    "table",
    "html",
}

ALLOWED_ASSET_PLACEMENT = {"", "Before Question", "After Question", "Inline"}

ALLOWED_MCQ_ANSWERS = {"A", "B", "C", "D"}

MATHS_CASE_PARTS = ("(i)", "(ii)", "(iii)")
MATHS_CASE_MARKS = 4
FORBIDDEN_SHEETS = {"Question Assets"}
QUESTIONS_SHEET_NAME = "Questions"


class SampleQuestionDirection(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question_type: str
    count: int = Field(ge=1, default=1)
    direction: str
    marks_each: int | None = Field(default=None, ge=1)


class ChapterDirection(BaseModel):
    model_config = ConfigDict(extra="forbid")

    chapter_no: int = Field(ge=1)
    chapter_title: str
    source_path: str
    core_concepts: list[str]
    skills_to_test: list[str]
    good_contexts: list[str]
    misconceptions_to_address: list[str]
    diagram_or_asset_needs: list[str]
    avoid: list[str]
    chapter_question_direction: str
    sample_question_directions: list[SampleQuestionDirection]
    target_question_counts: dict[str, int] | None = None

    @model_validator(mode="after")
    def derive_target_counts(self) -> ChapterDirection:
        if self.target_question_counts:
            return self
        counts: dict[str, int] = {}
        for sample in self.sample_question_directions:
            counts[sample.question_type] = counts.get(sample.question_type, 0) + sample.count
        object.__setattr__(self, "target_question_counts", counts or None)
        return self


class SubjectDirectionPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")

    job_type: Literal["direction"] = "direction"
    class_level: str
    subject: str
    subject_display: str | None = None
    approved_direction: bool = False
    id_prefix: str
    chapters: list[ChapterDirection]
    planning_notes: str | None = None
    skill_path: str | None = None
    class_policy_path: str | None = None
    subject_policy_path: str | None = None
    enforce_maths_case_format: bool = False


class PlanChapterJob(BaseModel):
    model_config = ConfigDict(extra="forbid")

    chapter_no: int = Field(ge=1)
    chapter_title: str
    source_path: str


class PlanSubjectJob(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: Literal["plan_subject"] = "plan_subject"
    job_type: Literal["plan"] = "plan"
    class_level: str
    subject: str
    subject_display: str | None = None
    id_prefix: str | None = None
    skill_path: str
    class_policy_path: str
    subject_policy_path: str
    output_direction_json: str
    output_direction_md: str
    chapters: list[PlanChapterJob]
    model: str | None = None
    model_preferences: ModelPreferences | None = None
    planning_notes: str | None = None

    @model_validator(mode="before")
    @classmethod
    def normalize_plan_job(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        d = dict(data)
        mode = d.get("mode") or d.get("job_type")
        if mode == "plan_subject":
            d["mode"] = "plan_subject"
            d["job_type"] = "plan"
        if "class" in d and "class_level" not in d:
            d["class_level"] = str(d.pop("class"))
        return d


class GenerateSubjectJob(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: Literal["generate_subject_from_approved_plan"] = "generate_subject_from_approved_plan"
    job_type: Literal["generate"] = "generate"
    approved_direction_path: str
    output_path: str
    class_level: str | None = None
    subject: str | None = None
    id_prefix: str | None = None
    model: str | None = None
    model_preferences: ModelPreferences | None = None
    enforce_maths_case_format: bool | None = None

    @model_validator(mode="before")
    @classmethod
    def normalize_generate_job(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        d = dict(data)
        mode = d.get("mode") or d.get("job_type")
        if mode == "generate_subject_from_approved_plan":
            d["mode"] = "generate_subject_from_approved_plan"
            d["job_type"] = "generate"
        if "class" in d and "class_level" not in d:
            d["class_level"] = str(d.pop("class"))
        return d


class QuestionRow(BaseModel):
    """One SAH question row. Serializes to Excel using exact header names."""

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    question_id: str = Field(alias="Question ID", min_length=1)
    class_level: str = Field(alias="Class", min_length=1)
    subject: str = Field(alias="Subject", min_length=1)
    chapter_no: int = Field(alias="Chapter No.", ge=1)
    chapter: str = Field(alias="Chapter", min_length=1)
    topic: str = Field(alias="Topic", default="")
    subtopic: str = Field(alias="Subtopic", default="")
    difficulty: str = Field(alias="Difficulty", min_length=1)
    question_type: str = Field(alias="Question Type", min_length=1)
    question_style: str = Field(alias="Question Style", default="")
    marks: int = Field(alias="Marks", ge=1)
    question: str = Field(alias="Question", min_length=1)
    option_a: str = Field(alias="Option A", default="")
    option_b: str = Field(alias="Option B", default="")
    option_c: str = Field(alias="Option C", default="")
    option_d: str = Field(alias="Option D", default="")
    correct_answer: str = Field(alias="Correct Answer", default="")
    answer_solution: str = Field(alias="Answer / Solution", default="")
    explanation: str = Field(alias="Explanation", default="")
    learning_outcome: str = Field(alias="Learning Outcome", default="")
    ncert_reference: str = Field(alias="NCERT Reference", default="")
    source_type: str = Field(alias="Source Type", default="")
    pyq_year: str = Field(alias="PYQ Year", default="")
    pyq_board_exam: str = Field(alias="PYQ Board/Exam", default="")
    pyq_paper_set: str = Field(alias="PYQ Paper/Set", default="")
    use_in_papers: str = Field(alias="Use in Papers", default="Yes")
    times_asked: int = Field(alias="Times Asked", default=0, ge=0)
    last_asked_date: str = Field(alias="Last Asked Date", default="")
    last_paper_id: str = Field(alias="Last Paper ID", default="")
    last_updated: str = Field(alias="Last Updated", default="")
    notes: str = Field(alias="Notes", default="")
    image_url: str = Field(alias="Image URL", default="")
    asset_format: str = Field(alias="Asset Format", default="")
    asset_data: str = Field(alias="Asset Data", default="")
    asset_placement: str = Field(alias="Asset Placement", default="Before Question")
    asset_width: int | None = Field(alias="Asset Width", default=None)
    asset_height: int | None = Field(alias="Asset Height", default=None)

    @field_validator("question_type")
    @classmethod
    def question_type_must_be_known(cls, v: str) -> str:
        if v not in QUESTION_TYPE_ORDER:
            raise ValueError(f"Unknown Question Type: {v!r}. Expected one of {QUESTION_TYPE_ORDER}")
        return v

    @field_validator("use_in_papers")
    @classmethod
    def use_in_papers_allowed(cls, v: str) -> str:
        if v not in ALLOWED_USE_IN_PAPERS:
            raise ValueError(f"Use in Papers must be Yes, Review, or No; got {v!r}")
        return v

    def to_sheet_dict(self) -> dict[str, Any]:
        today = date.today().isoformat()
        width = self.asset_width if self.asset_width is not None else ""
        height = self.asset_height if self.asset_height is not None else ""
        return {
            "Question ID": self.question_id,
            "Class": self.class_level,
            "Subject": self.subject,
            "Chapter No.": self.chapter_no,
            "Chapter": self.chapter,
            "Topic": self.topic,
            "Subtopic": self.subtopic,
            "Difficulty": self.difficulty,
            "Question Type": self.question_type,
            "Question Style": self.question_style,
            "Marks": self.marks,
            "Question": self.question,
            "Option A": self.option_a,
            "Option B": self.option_b,
            "Option C": self.option_c,
            "Option D": self.option_d,
            "Correct Answer": self.correct_answer,
            "Answer / Solution": self.answer_solution or self.correct_answer,
            "Explanation": self.explanation,
            "Learning Outcome": self.learning_outcome,
            "NCERT Reference": self.ncert_reference,
            "Source Type": self.source_type,
            "PYQ Year": self.pyq_year,
            "PYQ Board/Exam": self.pyq_board_exam,
            "PYQ Paper/Set": self.pyq_paper_set,
            "Use in Papers": self.use_in_papers,
            "Times Asked": self.times_asked,
            "Last Asked Date": self.last_asked_date,
            "Last Paper ID": self.last_paper_id,
            "Last Updated": self.last_updated or today,
            "Notes": self.notes,
            "Image URL": self.image_url,
            "Asset Format": self.asset_format,
            "Asset Data": self.asset_data,
            "Asset Placement": self.asset_placement or "Before Question",
            "Asset Width": width,
            "Asset Height": height,
        }

    def to_sheet_row(self) -> list[Any]:
        data = self.to_sheet_dict()
        return [data[h] for h in SAH_HEADERS]


class QuestionBatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    chapter_no: int = Field(ge=1)
    questions: list[QuestionRow] = Field(min_length=1)

    @model_validator(mode="after")
    def single_chapter(self) -> QuestionBatch:
        for q in self.questions:
            if q.chapter_no != self.chapter_no:
                raise ValueError(
                    f"Question {q.question_id} chapter {q.chapter_no} != batch chapter {self.chapter_no}"
                )
        return self


class GeneratedSubjectBatch(BaseModel):
    """LLM response wrapper for one subject generation call."""

    model_config = ConfigDict(extra="forbid")

    questions: list[QuestionRow] = Field(min_length=1)


def sort_questions(rows: list[QuestionRow]) -> list[QuestionRow]:
    type_rank = {t: i for i, t in enumerate(QUESTION_TYPE_ORDER)}

    def key(row: QuestionRow) -> tuple:
        return (
            row.chapter_no,
            type_rank.get(row.question_type, 99),
            row.question_id,
        )

    return sorted(rows, key=key)
