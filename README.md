# SAH Command Center

SAH Command Center is the teacher-facing app for Scholars Academic Home, Haldwani. It brings the daily teaching workflow into one React/Vite PWA: schedule, chapter library, lesson planning, concept resources, homework, and microtest generation.

The product app lives in `src/`. The `public/` folder is only for static assets, templates, and fallback data copied by Vite. Do not build new UI in `public/`.

## Current Product Model

Teachers start from Mission Control (`/`). The active period card launches contextual tools:

- `Plan` opens lesson-plan material.
- `Concept` opens concept-map material.
- `Homework` opens the homework workflow.
- `Test` opens `/microtests` with class, subject, and chapter context.

These tools are feature routes, not sidebar items. The sidebar is for broad navigation such as Today, Roadmap, Chapter Library, Timetable, and Admin.

## Data

The microtest feature reads the question bank through `src/lib/bank.ts`:

- Primary: Google Apps Script URL from `VITE_GOOGLE_SHEETS_URL`.
- Optional passcode: `VITE_BANK_PASSCODE`.
- Fallback: `public/fallback-bank.json` for offline/demo use.

Keep secrets in `.env`; `.env` is ignored. Use `.env.example` for safe placeholders.

## Commands

```sh
npm start      # run the Vite app at http://127.0.0.1:5173
npm run dev    # same dev server
npm run build  # production build into dist/
npm run preview
```

## Architecture Notes

Read `APP_ARCHITECTURE.md` for the product architecture and `PROJECT_CONTEXT.md` for AI-agent handoff context.
