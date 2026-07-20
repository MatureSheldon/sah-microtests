"""SAH question bank column schema (Excel Questions sheet)."""

SAH_HEADERS = [
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
    "Cognitive Skill",
    "Mastery Band",
    "Revision Link",
    "Quality Tags",
]

QUESTIONS_SHEET_NAME = "Questions"

QUESTION_TYPES = {
    "MCQ",
    "Assertion-Reason",
    "Very Short Answer",
    "Short Answer",
    "Long Answer",
    "Case/Source-Based",
}

FORBIDDEN_EXTRA_SHEETS = {"Question Assets"}
