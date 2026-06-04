# SAH Microtests Project Context

> Agents: for question-bank generation work, read [AGENTS.md](AGENTS.md) and [skills/SAH_NCERT_Question_Bank_Generator_SKILL/SKILL.md](skills/SAH_NCERT_Question_Bank_Generator_SKILL/SKILL.md) first.

SAH Microtests is a browser-based microtest builder and question-bank workflow for Scholars Academic Home, Haldwani.

The product started as a Class 9 Science microtest dashboard, but it has evolved into two connected systems:

1. A teacher-facing PWA-style microtest builder in `public/`.
2. An internal AI-assisted question-bank generation pipeline in `tools/question_bank_agent/`.

## Current Active Folder

Use this repository location:

```text
/Users/adityabhatt/Documents/sah-microtests
```

The older copy under `Documents/School Projects/sah-microtests` is stale and should not be treated as the active workspace.

## What The Teacher App Does

- Reads approved question-bank rows from Google Sheets through Apps Script.
- Lets teachers choose class, subject, chapters, chapter-wise percentages, difficulty mix, marks, and duration.
- Shows a live paper preview.
- Allows swap, lock, remove, and flag-question workflows.
- Exports a Word `.docx` paper from the browser.
- Supports math rendering through KaTeX.
- Supports image/asset fields for visual questions.
- Uses service-worker/offline fallback assets for a PWA-style experience.

## Active Frontend Files

```text
public/index.html
public/app-v2.js
public/styles-v2.css
public/sw.js
public/fallback-bank.json
public/data/subject-units.json
```

The old references to `public/app.js` and `public/styles.css` are no longer the current app path.

## Google Sheets Model

The current Apps Script expects one tab per subject, such as:

```text
Science
Maths
English
Hindi
Social Science
```

Each subject tab contains question rows using the SAH schema. `Use in Papers = Yes` is the live-bank gate.

The app also uses:

- `Generated Papers` for export logs.
- `Chapters` when available.
- `public/data/subject-units.json` for bundled subject/unit metadata.

## Required Question Columns

Final question-bank workbooks and Google Sheet subject tabs should use this schema:

```text
Question ID
Class
Subject
Chapter No.
Chapter
Topic
Subtopic
Difficulty
Question Type
Question Style
Marks
Question
Option A
Option B
Option C
Option D
Correct Answer
Answer / Solution
Explanation
Learning Outcome
NCERT Reference
Source Type
PYQ Year
PYQ Board/Exam
PYQ Paper/Set
Use in Papers
Times Asked
Last Asked Date
Last Paper ID
Last Updated
Notes
Image URL
Asset Format
Asset Data
Asset Placement
Asset Width
Asset Height
```

## Question Taxonomy

Question Type:

- `MCQ`
- `Assertion-Reason`
- `Very Short Answer`
- `Short Answer`
- `Long Answer`
- `Case/Source-Based`

Question Style:

- `Direct Recall`
- `Conceptual`
- `Application`
- `Reasoning`
- `Competency-Based`
- `Numerical`
- `Diagram-Based`
- `Data/Table-Based`
- `Experiment/Activity-Based`
- `Visual/Figure-Based`

## Question-Bank Agent System

The question-bank automation is governed by:

```text
AGENTS.md
skills/SAH_NCERT_Question_Bank_Generator_SKILL/SKILL.md
policies/classes/
policies/subjects/
sources/question_bank/
tools/question_bank_agent/
```

The intended output is one validated Excel workbook per subject, with one main `Questions` sheet containing all chapters for that subject.

After approval, rows are imported into the school's Google Sheet subject tabs.

## Running Locally

Start the local host:

```sh
npm start
```

Open:

```text
http://localhost:3029
```

Build CSS:

```sh
npm run build:css
```

## Important Current State

- The current branch is `feature/class9-english-units`.
- The new repo is ahead of `question-bank-agent-system`.
- English planning/source files are present locally and should be committed when approved.
- `public/data/subject-units.json` is the canonical lowercase path. Avoid `public/Data` casing in future edits.
- Root `/data/` and `/exports/` are local/deprecated output folders and are ignored.

