# Minimum Central Control Workbook

This is the smallest useful Google Sheet setup for the SAH Command Center gateway.

Create one Google Sheet named:

```text
SAH_Command_Center_Control
```

Then create these tabs by importing the matching CSV files from `public/templates/`.

## Phase 1 Required Tabs

```text
teachers
classes
sections
subjects
section_subject_assignments
timetable_slots
academic_calendar
app_registry
teaching_progress_summary
topic_progress
period_completion_log
```

> [!NOTE]
> The curriculum and resource index sheets (`curriculum_index`, `teaching_plan`, `resource_registry`) have been removed from Central Control. All curriculum content now resides inside the individual **Class-Subject Workbooks** resolved dynamically via `app_registry`.

## Matching CSV Templates

```text
public/templates/central_minimum_teachers.csv
public/templates/central_minimum_classes.csv
public/templates/central_minimum_sections.csv
public/templates/central_minimum_subjects.csv
public/templates/central_minimum_section_subject_assignments.csv
public/templates/central_minimum_timetable_slots.csv
public/templates/central_minimum_academic_calendar.csv
public/templates/central_minimum_resource_registry.csv -> (maps to app_registry columns)
public/templates/central_minimum_teaching_progress_summary.csv
public/templates/central_minimum_topic_progress.csv
public/templates/central_minimum_period_completion_log.csv
```

## Why These Tabs

- **`teachers`**: lets the app show the teacher selector.
- **`classes`, `sections`, `subjects`**: stable IDs and display labels.
- **`section_subject_assignments`**: maps teachers to their classes.
- **`timetable_slots`**: powers Today's Schedule.
- **`academic_calendar`**: provides the active academic year.
- **`app_registry`**: points the gateway to the specific Class-Subject workbook.
- **`teaching_progress_summary`**: stores the current topic for each class-section-subject.
- **`topic_progress`**: records completed topics.
- **`period_completion_log`**: append-only Mark Done history.

## Later Tabs

These are useful later but are not required for the first real dashboard:

```text
homework_assignments
microtest_log
question_usage_log
question_bank_map
```
