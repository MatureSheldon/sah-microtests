# SAH Command Center Project Context

> Agents: for question-bank generation work, read `AGENTS.md` and `skills/SAH_NCERT_Question_Bank_Generator_SKILL/SKILL.md` first.

SAH Command Center is the single teacher-facing app for Scholars Academic Home, Haldwani. It is a React/Vite PWA that combines Mission Control, timetable awareness, chapter resources, lesson planning, homework, concept resources, and microtest generation.

## Active Repository

Use this repository location:

```text
/Users/adityabhatt/Documents/sah-microtests
```

The older copy under `Documents/School Projects/sah-microtests` is stale and should not be used for product work.

## Product Model

The app is not separate dashboards. The teacher starts from Mission Control (`/`) and launches context-specific tools from the active period card:

- Plan
- Concept
- Homework
- Test / Microtest

These tools are React feature routes. They should not be duplicated as a standalone app in `public/`.

## Active Frontend

Human-editable product source lives in:

```text
src/
index.html
vite.config.ts
package.json
```

`public/` is only for static assets and fallback data:

```text
public/fallback-bank.json
public/data/subject-units.json
public/templates/
public/icon-192.png
public/icon-512.png
public/logo.png
```

Do not reintroduce `public/app-v2.js`, standalone builders, or old local-server UI paths.

## Question Bank Data

The microtest feature uses `src/lib/bank.ts`.

Primary live source:

```text
VITE_GOOGLE_SHEETS_URL
VITE_BANK_PASSCODE
```

Fallback source:

```text
public/fallback-bank.json
```

The Google Sheet subject tabs should use the SAH question-bank schema:

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

## Question-Bank Agent

Question-bank planning, generation, validation, and workbook writing live under:

```text
tools/question_bank_agent/
skills/SAH_NCERT_Question_Bank_Generator_SKILL/
policies/
sources/
```

The agent creates and validates offline question-bank workbooks. The React app consumes approved bank data from Google Sheets or fallback JSON.

## Commands

```sh
npm start
npm run dev
npm run build
npm run preview
```

`dist/` is generated and ignored.

## Current Architecture Rule

There is one app: the React/Vite SAH Command Center. Microtests, homework, plans, and concept maps are features inside that app, launched from Today/Chapter context buttons.
