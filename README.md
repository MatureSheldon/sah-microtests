# SAH Microtests

SAH Microtests is a browser-based microtest builder for Scholars Academic Home, Haldwani.

It reads approved question-bank rows from Google Sheets, lets teachers generate chapter-wise microtests, preview and swap questions, and export a Word `.docx` paper with an answer-key section.

## Current App

The active frontend is the v2/PWA app:

```text
public/index.html
public/app-v2.js
public/styles-v2.css
public/sw.js
```

The app can run through the local static server:

```sh
npm start
```

Then open:

```text
http://localhost:3029
```

## Google Sheets Connection

The current app stores the deployed Apps Script URL and optional passcode in the browser settings modal, not in the old `config.json` flow.

In the dashboard:

1. Click the settings icon.
2. Paste the deployed Apps Script web app URL.
3. Enter the passcode if one is configured in Apps Script properties.
4. Save and reconnect.

The legacy `server.js` still exists for local hosting and older API fallback behavior, but the v2 app does most paper generation and Word export in the browser.

## Google Sheet Layout

The Apps Script connector now reads subject-wise tabs. For example:

```text
Science
Maths
English
Hindi
Social Science
```

Each subject tab uses the SAH question-bank headers. The major columns are:

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

Optional supporting tabs:

- `Chapters`
- `Generated Papers`

## Question-Bank Automation

Question-bank planning, generation, validation, and workbook writing live under:

```text
tools/question_bank_agent/
skills/SAH_NCERT_Question_Bank_Generator_SKILL/
policies/
sources/
```

Before working on question-bank generation, read:

```text
AGENTS.md
skills/SAH_NCERT_Question_Bank_Generator_SKILL/SKILL.md
```

## Useful Commands

Start local app:

```sh
npm start
```

Build Tailwind CSS:

```sh
npm run build:css
```

Check frontend syntax:

```sh
node --check public/app-v2.js
```

