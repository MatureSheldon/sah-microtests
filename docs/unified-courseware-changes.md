# Unified Courseware Workbook & Dynamic Pacing Changes

This document details the architectural and code changes implemented to transition to the **Class-Subject Workbook** model with a **Dynamic Pacing Engine**.

---

## 1. Class-Subject Workbook Schemas (7 Sheets)

Every class and subject now has its own dedicated Google Spreadsheet containing all content. The sheet schemas are defined as follows:

### 1. `Chapter_Map`
Defines the chapters and their default priority for pacing allocation.
- **Columns**: `chapter_id`, `chapter_no`, `chapter_title`, `default_priority`, `status`
- **Example**: `MATH9_CH01`, `1`, `Lines and Angles`, `3`, `active`

### 2. `Topic_Map`
Defines the topic sequence and their internal weighting within chapters.
- **Columns**: `topic_id`, `chapter_id`, `sequence_no`, `topic_title`, `relative_weight`, `relative_difficulty`, `learning_outcomes`, `status`
- **Example**: `MATH9_CH01_T01`, `MATH9_CH01`, `1`, `Vertically opposite angles`, `1.5`, `Medium`, `Prove vertically opposite angles are equal`, `active`

### 3. `Lesson_Plans`
Contains the 5E instructional phases. Decoupled from hardcoded period counts.
- **Columns**: `lesson_plan_id`, `chapter_id`, `topic_id`, `objectives`, `phase_engage`, `phase_explore`, `phase_explain`, `phase_elaborate`, `phase_evaluate`, `required_resources`, `notes`

### 4. `Concepts`
Detailed explanation cards, formulas, and misconceptions for student/teacher reference.
- **Columns**: `concept_id`, `chapter_id`, `topic_id`, `concept_title`, `explanation`, `key_formulas`, `misconceptions`, `visual_type`, `visual_data`, `notes`

### 5. `Homework`
Flat sheet for standalone homework questions with separate IDs.
- **Columns**: `homework_id`, `chapter_id`, `topic_id`, `set_title`, `sequence_no`, `question_text`, `marks`, `difficulty`, `answer`, `explanation`, `status`

### 6. `Resources`
External Smart Board, video, or worksheet link references.
- **Columns**: `resource_id`, `chapter_id`, `topic_id`, `resource_type`, `title`, `url`, `description`, `status`

### 7. `Questions` (UNCHANGED)
The existing SAH question bank schema is retained intact.

---

## 2. Central Control Workbook Updates

Admin and schedule progress tracking remain in the central control workbook (`SAH_Command_Center_Control`), but course content is removed to prevent duplication.

* **Retained Tabs**: `teachers`, `classes`, `sections`, `subjects`, `section_subject_assignments`, `timetable_slots`, `academic_calendar`, `teaching_progress_summary` (write target), `topic_progress` (write target), `period_completion_log`.
* **Updated Tab**: `app_registry` now serves as the pointer mapping `class_id` + `subject_id` + `academic_year` to the respective subject spreadsheet ID.
* **Removed Tabs**: `curriculum_index`, `teaching_plan`, `resource_registry` (replaced by subject workbook sheets).

---

## 3. Code Modifications

### A. Offline Generation & Validation Tooling
1. **`tools/question_bank_agent/src/schemas.py`**
   - Added Python Pydantic models for the new courseware rows: `ChapterMapRow`, `TopicMapRow`, `LessonPlanRow`, `ConceptRow`, `HomeworkRow`, `ResourceRow`.
   - Declared exact header sequences as constants (`CHAPTER_MAP_HEADERS`, etc.).
2. **`tools/question_bank_agent/src/xlsx_writer.py`**
   - Refactored `write_subject_workbook` to output all 7 sheets.
   - Added backward-compatible default generators: if curriculum sheets are not provided, the writer automatically extracts unique chapters/topics from question rows to produce a fully populated, valid 7-sheet workbook.
3. **`tools/question_bank_agent/validate_workbook.py`**
   - Expanded the command-line validator to perform multi-sheet validation. Enforces header consistency, checks for duplicate IDs, and performs referential integrity checks (e.g., verifying `topic_id` exists in `Topic_Map`).

### B. Google Apps Script Gateway (`Gateway.gs`)
1. **Removed Central Content Dependencies**: Simplified validation properties by removing obsolete central index requirements.
2. **Workbook Caching**: Added request-scoped caching maps `_subjectWorkbookCache` and `_cachedSubjectRows` to cache open workbook handles and row reads. This limits Google API overhead to one spreadsheet open call per subject during batch operations (like loading the dashboard).
3. **Endpoint Resolvers**:
   - `getDashboard()`: Queries current topic details, parses resource existence (lesson plans, concepts, homework), and resolves external links from the subject workbook.
   - `getPeriodContext()`: Pulls topic sequences from `Topic_Map` and filters upcoming/completed states.
   - `getHomework()`: Extracts active homework items sorted by `sequence_no`.
   - `getBank()`: Returns both question banks and chapter maps.
   - `getLessonPlan()` & `getConcept()` [NEW]: Custom actions returning instructional content.
   - `markPeriodDone()`: Uses subject `Topic_Map` to resolve next topic index for auto-advance.

### C. PWA Frontend Client & Views
1. **`src/lib/models.ts`**
   - Registered `LessonPlan` and `Concept` interfaces.
   - Added `PeriodResourceFlags` to link `Plan` and `Concept` cards.
2. **`src/lib/gateway.ts`** & **`src/lib/gateway-mock.ts`**
   - Implemented `getLessonPlan()` and `getConcept()` client queries with offline mock data fallbacks.
3. **`src/components/PeriodCards.tsx`**
   - Connected `Plan` and `Concept` resource tiles to point to `/chapters/:topicId` and `/concepts/:topicId` passing class and subject parameters.
   - Added a colorful pacing badge (`On Track`, `Ahead`, `Behind`) next to the period number header.
4. **`src/pages/LessonPlanDetail.tsx`**
   - Refactored page to fetch instructional plans dynamically from the gateway.
5. **`src/pages/ConceptDetail.tsx` [NEW]**
   - Created a concept viewer showing rich text explanations, KaTeX formula renderers (`renderMath`), and common misconception boxes. Registered route in `src/main.tsx`.
6. **`src/pages/Roadmap.tsx`**
   - Enhanced chapter rows to be expandable.
   - Within each chapter, renders its topic map including difficulty badges, relative weights, and calculated target periods:
     $$\text{Target Periods} = \frac{\text{Topic Weight}}{\sum \text{Weights}} \times \text{Allocated Chapter Periods}$$

---

## 4. Data Contract & Subject Normalization Corrections

To prevent runtime issues during pilot testing:
1. **Lowercase Key Normalization (`bank.ts`)**:
   - The gateway lowercases spreadsheet headers via `getRows()`. [bank.ts](file:///Users/adityabhatt/Documents/sah-microtests/src/lib/bank.ts) was updated in `normalizeQuestion()` to support fallback mappings for all lowercased and snake_cased fields (`question id`, `chapter no.`, `question type`, `use in papers`).
   - Reconstructed the `options` mapping object to read option values safely from lowercased keys (`option a`, etc.) when options structure is flat.
   - Restored mappings for same-row assets properties (`asset format`, `asset data`, etc.).
2. **Subject Mapping Alignment (`Gateway.gs` & `bank.ts`)**:
   - Aligned subject normalization in `Gateway.gs` and `bank.ts`. Mapped short codes `SCI` and `SCIENCE` consistently to `Science`, and `MATH`/`MATHS`/`MATHEMATICS` to `Mathematics`. This ensures microtest builder searches and filters do not return empty questions due to subject code mismatch.
3. **Dynamic Microtest Activation (`Gateway.gs`)**:
   - Removed the `has_microtest: true` forced bypass. The microtest button is now dynamically enabled if an actual microtest resource is found or if course content (lesson plans, concepts, homework) has been loaded for the topic.

---

## 5. Build Status

React PWA production build runs and compiles without any typescript or bundling warnings:
```bash
vite v8.0.16 building client environment for production...
✓ 60 modules transformed.
✓ built in 470ms
```
All components, assets, lazy loaded page chunks, and service worker registries compile cleanly to the `dist/` directory.

