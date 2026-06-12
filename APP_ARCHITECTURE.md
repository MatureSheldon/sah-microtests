# SAH Command Center Architecture

SAH Command Center is one React/Vite PWA. The old standalone `public/` microtest app is being retired; new product work belongs in `src/`.

## Product Shape

The app is a teacher command center, not a collection of separate apps. Teachers begin at Mission Control and launch tools from the live teaching context.

```text
Mission Control / Today
  active period
    Plan button
    Concept button
    Homework button
    Test button -> /microtests?class=...&subject=...&chapter=...

Chapter Library
  selected chapter
    Plan
    Concept
    Homework
    Test

Feature routes
  /microtests
  /chapters/:planId
  future: /homework, /concept-map
```

Feature routes may have URLs, but they are launched from context buttons rather than placed in the sidebar. The sidebar stays reserved for broad workspace areas: Today, Roadmap, Chapter Library, Timetable, and Admin.

## Source Layout

```text
src/
  components/       shared shell and dashboard components
  pages/            route screens
  lib/              data clients, generation, exports, scheduling utilities
  styles.css        app styling

public/
  fallback-bank.json          offline/demo question bank
  data/subject-units.json     bundled subject/chapter metadata
  templates/                  CSV templates for school data import
  icon/logo assets

tools/question_bank_agent/    offline AI question-bank generation pipeline
google-apps-script/           Google Sheets connector
```

## Data Flow

`src/lib/bank.ts` is the question-bank boundary. It loads live Google Sheets data when `VITE_GOOGLE_SHEETS_URL` is configured and falls back to `public/fallback-bank.json` otherwise.

The React app should not call old `server.js` APIs. Browser-local settings, Google Apps Script, and Vite env vars are the intended integration paths.

## Efficiency Rules

- Lazy-load route screens from `src/main.tsx`.
- Lazy-load heavy feature libraries only when needed. For example, `docx` and `file-saver` should load only when exporting a Word file.
- Keep `public/` lean. Do not commit browser bundles such as old KaTeX, JSZip, service workers, or standalone HTML shells. Vite and npm packages provide those in the build.
- `dist/` is generated and ignored.

## Build

```sh
npm start
npm run build
npm run preview
```

GitHub Pages deploys the Vite `dist/` output using `.github/workflows/deploy.yml`.
