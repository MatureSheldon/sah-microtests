/* ═══════════════════════════════════════════════════════════════════════════
 *  SAH Command Center — Domain Models
 *  Single source of truth for all data types flowing between the Google
 *  Sheets gateway and the React frontend.
 * ═══════════════════════════════════════════════════════════════════════════ */

// ── Core Entities ──────────────────────────────────────────────────────────

export interface Teacher {
  teacher_id: string;
  teacher_name: string;
  short_name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
}

export interface ClassInfo {
  class_id: string;     // e.g. "CLASS_8"
  class_label: string;  // e.g. "Class 8"
  status: 'active' | 'inactive';
}

export interface Section {
  section_id: string;   // e.g. "A"
  class_id: string;
  section_label: string; // e.g. "8-A"
  status: 'active' | 'inactive';
}

export interface Subject {
  subject_id: string;   // e.g. "MATH"
  subject_name: string; // e.g. "Mathematics"
  subject_code: string;
  status: 'active' | 'inactive';
}

export interface SectionSubjectAssignment {
  assignment_id: string;
  academic_year: string;
  class_id: string;
  section_id: string;
  subject_id: string;
  teacher_id: string;
  role: 'primary' | 'secondary' | 'substitute';
  effective_from: string; // YYYY-MM-DD
  effective_to: string;
  status: 'active' | 'inactive';
}

// ── Timetable & Calendar ───────────────────────────────────────────────────

export type SlotType =
  | 'instructional'
  | 'break'
  | 'assembly'
  | 'free'
  | 'substitution'
  | 'remedial'
  | 'practical'
  | 'exam'
  | 'event';

export interface TimetableSlot {
  slot_id: string;
  academic_year: string;
  day: string;          // "Monday" … "Saturday"
  period_no: number;
  start_time: string;   // "HH:mm"
  end_time: string;
  slot_type: SlotType;
  class_id: string;
  section_id: string;
  subject_id: string;
  assignment_id: string;
  teacher_id: string;
  room_id: string;
  effective_from: string;
  effective_to: string;
  status: 'active' | 'inactive';
}

export type CalendarEventType =
  | 'holiday'
  | 'exam_window'
  | 'ptm'
  | 'event'
  | 'restricted_holiday';

export interface AcademicCalendarEvent {
  event_id: string;
  academic_year: string;
  event_type: CalendarEventType;
  event_name: string;
  start_date: string;   // YYYY-MM-DD
  end_date: string;
  scope: 'school' | 'class' | 'section';
  class_ids: string;    // comma-separated or blank
  section_ids: string;
  affected_periods: string;
  is_working_day: boolean;
  is_instructional_day: boolean;
  notes: string;
  status: 'active' | 'inactive';
}

// ── Curriculum & Progress ──────────────────────────────────────────────────

export interface CurriculumTopic {
  curriculum_id: string;
  academic_year: string;
  class_id: string;
  subject_id: string;
  chapter_id: string;
  chapter_no: number;
  chapter_title: string;
  topic_id: string;
  topic_title: string;
  sequence_no: number;
  planned_periods: number;
  status: 'active' | 'inactive';
}

export interface TeachingPlanItem {
  plan_id: string;
  academic_year: string;
  class_id: string;
  subject_id: string;
  sequence_no: number;
  chapter_id: string;
  topic_id: string;
  topic_title?: string;
  planned_periods: number;
  planned_week: number;
  status: 'active' | 'inactive';
  status_type?: 'past_incomplete' | 'current' | 'upcoming';
}

export type TopicStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'revision_done';

export interface TopicProgress {
  progress_id: string;
  academic_year: string;
  class_id: string;
  section_id: string;
  subject_id: string;
  chapter_id: string;
  topic_id: string;
  status: TopicStatus;
  completed_by_teacher_id: string;
  completed_on: string;  // YYYY-MM-DD or blank
  last_updated: string;
}

export interface TeachingProgressSummary {
  summary_id: string;
  academic_year: string;
  class_id: string;
  section_id: string;
  subject_id: string;
  current_chapter_id: string;
  current_topic_id: string;
  current_chapter_title: string;
  current_topic_title: string;
  teacher_id: string;
  status: TopicStatus;
  last_taught_date: string;
  last_updated: string;
}

// ── Resources & Content ────────────────────────────────────────────────────

export type ResourceType =
  | 'lesson_plan_md'
  | 'lesson_plan_pdf'
  | 'chapter_notes'
  | 'concept_map'
  | 'homework'
  | 'worksheet'
  | 'smart_board'
  | 'teacher_material'
  | 'pedagogy_doc'
  | 'video';

export interface ResourceRegistryItem {
  resource_id: string;
  academic_year: string;
  class_id: string;
  subject_id: string;
  chapter_id: string;
  topic_id: string;
  resource_type: ResourceType;
  title: string;
  production_url: string;
  draft_url: string;
  status: 'active' | 'inactive' | 'draft';
  version: number;
  last_updated: string;
}

export interface QuestionBankMap {
  map_id: string;
  academic_year: string;
  class_id: string;
  subject_id: string;
  chapter_id: string;
  topic_id: string;
  dataset_id: string;
  question_bank_class: string;   // text label used in QB, e.g. "Class 8"
  question_bank_subject: string; // text label used in QB, e.g. "Mathematics"
  question_bank_chapter: string; // text label used in QB, e.g. "Rational Numbers"
  question_bank_topic: string;   // text label used in QB
  status: 'active' | 'inactive';
}

// ── Homework ───────────────────────────────────────────────────────────────

export type HomeworkSourceMode = 'question_bank' | 'curated' | 'manual';

export interface HomeworkSet {
  homework_set_id: string;
  class_id: string;
  subject_id: string;
  chapter_id: string;
  topic_id: string;
  subtopic_id: string;
  title: string;
  source_mode: HomeworkSourceMode;
  total_questions: number;
  estimated_minutes: number;
  status: 'active' | 'inactive';
}

export interface HomeworkItem {
  homework_item_id: string;
  homework_set_id: string;
  source_type: 'question_bank' | 'manual';
  question_id: string;
  question_text: string;
  marks: number;
  difficulty: string;
  sequence_no: number;
}

export interface HomeworkAssignment {
  homework_assignment_id: string;
  academic_year: string;
  class_id: string;
  section_id: string;
  subject_id: string;
  homework_set_id: string;
  assigned_by_teacher_id: string;
  assigned_date: string;
  due_date: string;
  status: 'assigned' | 'completed' | 'cancelled';
}

// ── Logs ───────────────────────────────────────────────────────────────────

export type PeriodActionType =
  | 'mark_done'
  | 'revision_only'
  | 'period_not_taught'
  | 'skipped'
  | 'manual_correction';

export interface PeriodCompletionLog {
  log_id: string;
  academic_year: string;
  date: string;
  slot_id: string;
  class_id: string;
  section_id: string;
  subject_id: string;
  teacher_id: string;
  chapter_id: string;
  topic_ids_completed: string; // comma-separated
  action_type: PeriodActionType;
  notes: string;
  timestamp: string;           // ISO 8601
}

// ── Composite / UI Types ───────────────────────────────────────────────────

/** Availability flags for a period's resource buttons. */
export interface PeriodResourceFlags {
  has_lesson_plan: boolean;
  lesson_plan_url?: string;
  has_concept_map: boolean;
  concept_map_url?: string;
  has_homework: boolean;
  homework_set_id?: string;
  has_microtest: boolean;
  microtest_class?: string;
  microtest_subject?: string;
  microtest_chapter?: string;
  microtest_topic?: string;
  has_smart_board: boolean;
  smart_board_url?: string;
}

/** A single period as rendered on the dashboard. */
export interface DashboardPeriod {
  slot: TimetableSlot;
  class_label: string;
  section_label: string;
  subject_name: string;
  chapter_title: string;
  topic_title: string;
  chapter_id: string;
  topic_id: string;
  progress_status: TopicStatus;
  pacing: 'on-track' | 'behind' | 'ahead';
  resources: PeriodResourceFlags;
  is_content_available: boolean; // false for non-pilot classes
}

/** Full dashboard payload returned by the gateway. */
export interface DashboardData {
  teacher: Teacher;
  date: string;             // YYYY-MM-DD
  academic_year: string;
  periods: DashboardPeriod[];
  summary: {
    total_teaching: number;
    completed: number;
    current_period_no: number;
  };
}

/** Payload sent when teacher clicks Mark Done. */
export interface MarkDonePayload {
  slot_id: string;
  date: string;
  class_id: string;
  section_id: string;
  subject_id: string;
  teacher_id: string;
  chapter_id: string;
  topic_ids_completed: string[];
  action_type: PeriodActionType;
  notes: string;
}

/** Gateway query for period context. */
export interface PeriodContextQuery {
  slot_id: string;
  date: string;
}

/** Full period context for Mark Done dialog. */
export interface PeriodContext {
  slot: TimetableSlot;
  progress: TeachingProgressSummary;
  planned_topics: TeachingPlanItem[];
  topic_progress: TopicProgress[];
  resources: ResourceRegistryItem[];
}

export interface LessonPlan {
  id: string;
  chapterTitle: string;
  subject: string;
  klass: string;
  duration: string;
  objectives: string[];
  phases: {
    engage: string;
    explore: string;
    explain: string;
    elaborate: string;
    evaluate: string;
  };
  resources: string[];
  notes?: string;
}

export interface Concept {
  id: string;
  topic_id?: string;
  title: string;
  explanation: string;
  key_formulas: string[];
  misconceptions: string[];
  visual_type?: string;
  visual_data?: string;
  notes?: string;
}

// ── Library / Browse Types ───────────────────────────────────────

/** A single topic row in the subject outline with resource flags. */
export interface SubjectOutlineTopic {
  topic_id: string;
  topic_title: string;
  sequence_no: number;
  planned_periods: number;
  has_lesson_plan: boolean;
  has_concept: boolean;
  has_homework: boolean;
  has_microtest: boolean;
}

/** A chapter with its topics in the subject outline. */
export interface SubjectOutlineChapter {
  chapter_id: string;
  chapter_no: number;
  chapter_title: string;
  total_periods: number;
  topics: SubjectOutlineTopic[];
}

/** Full subject outline returned by getSubjectOutline. */
export interface SubjectOutline {
  ok: boolean;
  class_id: string;
  subject_id: string;
  chapters: SubjectOutlineChapter[];
  warnings?: string[];
}

/** A single class+subject combo a teacher is assigned to. */
export interface TeacherAssignment {
  class_id: string;    // e.g. "CLASS_9"
  class_label: string; // e.g. "9"
  subject_id: string;  // e.g. "MATH"
}
