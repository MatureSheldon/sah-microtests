# SAH Microtests Project Context

SAH Microtests is a local dashboard for Scholars Academic Home, Haldwani, to generate weekly microtests from a structured question bank. The product is being built first for Class 9 Science, but the dashboard is designed for multiple classes and subjects.

## What The System Does

- Reads a question bank from Google Sheets.
- Lets a teacher choose class, subject, chapters, chapter-wise percentages, difficulty mix, total marks, and duration.
- Generates a preview microtest.
- Allows teachers to swap, lock, or remove questions before export.
- Exports a Word `.docx` file containing the student paper and an answer-key section.
- Records generated papers and updates question usage fields so repeated questions can be avoided.

## Current Data Source

The source of truth is Google Sheets, exposed through a Google Apps Script web app.

The local server reads from the configured Apps Script URL in:

```text
config.json
```

If Google Sheets is unavailable, the server falls back to:

```text
data/class-9-science.json
```

The dashboard shows the active data source as either `Google Sheets` or `local fallback file`.

## Required Google Sheet Structure

The question bank must have a `Questions` tab with these headers:

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
```

Optional but recommended tabs:

- `Chapters`: class, subject, chapter number, chapter name, and planning fields.
- `Generated Papers`: created automatically if missing, used for paper logs.

## Question Type Design

`Question Type` should use board-style buckets:

- `MCQ`
- `Assertion-Reason`
- `Very Short Answer`
- `Short Answer`
- `Long Answer`
- `Case/Source-Based`

`Question Style` adds the deeper pattern:

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

This keeps the system aligned with CBSE board-style training while still working for weekly microtests.

## Key Files

```text
server.js
```

Local Node server. Serves the dashboard, reads question data, exports Word files, logs generated papers, and writes usage updates.

```text
public/index.html
public/app.js
public/styles.css
```

Frontend dashboard. Handles class/subject selection, chapter mix, difficulty mix, question preview, swapping, locking, and export.

```text
google-apps-script/Code.gs
```

Google Apps Script code to paste into the Google Sheet’s Apps Script project. It exposes question-bank data and accepts generated-paper logs.

```text
config.json
```

Local private config containing the deployed Apps Script web app URL.

```text
README.md
```

Setup and connection instructions.

## Running Locally

From the project directory:

```sh
npm start
```

Then open:

```text
http://localhost:3029
```

## Important Current State

- Class and subject selectors are product-level, not hardcoded only for Class 9 Science.
- Class 9 Science is the first live dataset.
- The dashboard refreshes the Google Sheet bank on focus, every 60 seconds, and through the `Refresh Bank` button.
- New chapters appear automatically when they exist in question rows; with the updated Apps Script, they can also appear from the `Chapters` tab.
- Demo exports do not update usage counts.
- Real exports update `Times Asked`, `Last Asked Date`, and `Last Paper ID`.

