/* ═══════════════════════════════════════════════════════════════════════════
 *  SAH Command Center — Gateway Mock Data
 *  Realistic mock data that mirrors what the live Apps Script gateway
 *  would return. Used when VITE_GATEWAY_URL is not set.
 * ═══════════════════════════════════════════════════════════════════════════ */

import type {
  Teacher,
  DashboardData,
  DashboardPeriod,
  PeriodContext,
  TeachingPlanItem,
  TopicProgress,
  ResourceRegistryItem,
  TeachingProgressSummary,
  HomeworkSet,
  HomeworkItem,
  TimetableSlot,
  LessonPlan,
  Concept,
} from './models';

// ── Teachers ───────────────────────────────────────────────────────────────

export const MOCK_TEACHERS: Teacher[] = [
  { teacher_id: 'T001', teacher_name: 'Anjali Bisht', short_name: 'AB', email: 'anjali@sah.edu.in', phone: '', status: 'active' },
  { teacher_id: 'T002', teacher_name: 'Rakesh Pandey', short_name: 'RP', email: 'rakesh@sah.edu.in', phone: '', status: 'active' },
  { teacher_id: 'T003', teacher_name: 'Sunita Rawat', short_name: 'SR', email: 'sunita@sah.edu.in', phone: '', status: 'active' },
  { teacher_id: 'T004', teacher_name: 'Deepak Joshi', short_name: 'DJ', email: 'deepak@sah.edu.in', phone: '', status: 'active' },
  { teacher_id: 'T005', teacher_name: 'Meena Kapoor', short_name: 'MK', email: 'meena@sah.edu.in', phone: '', status: 'active' },
];

// ── Mrs. Bisht's timetable slots (Thursday) ────────────────────────────────

const BISHT_SLOTS: TimetableSlot[] = [
  {
    slot_id: 'TT_001', academic_year: '2026-27', day: 'Thursday', period_no: 1,
    start_time: '08:30', end_time: '09:15', slot_type: 'instructional',
    class_id: 'CLASS_8', section_id: 'A', subject_id: 'SCI',
    assignment_id: 'ASSIGN_005', teacher_id: 'T001', room_id: 'R10',
    effective_from: '2026-04-01', effective_to: '2027-03-31', status: 'active',
  },
  {
    slot_id: 'TT_002', academic_year: '2026-27', day: 'Thursday', period_no: 2,
    start_time: '09:15', end_time: '10:00', slot_type: 'instructional',
    class_id: 'CLASS_9', section_id: 'C', subject_id: 'MATH',
    assignment_id: 'ASSIGN_003', teacher_id: 'T001', room_id: 'R12',
    effective_from: '2026-04-01', effective_to: '2027-03-31', status: 'active',
  },
  {
    slot_id: 'TT_BRK', academic_year: '2026-27', day: 'Thursday', period_no: 0,
    start_time: '10:00', end_time: '10:15', slot_type: 'break',
    class_id: '', section_id: '', subject_id: '',
    assignment_id: '', teacher_id: '', room_id: '',
    effective_from: '2026-04-01', effective_to: '2027-03-31', status: 'active',
  },
  {
    slot_id: 'TT_003', academic_year: '2026-27', day: 'Thursday', period_no: 3,
    start_time: '10:45', end_time: '11:30', slot_type: 'instructional',
    class_id: 'CLASS_10', section_id: 'B', subject_id: 'MATH',
    assignment_id: 'ASSIGN_001', teacher_id: 'T001', room_id: 'R14',
    effective_from: '2026-04-01', effective_to: '2027-03-31', status: 'active',
  },
  {
    slot_id: 'TT_004', academic_year: '2026-27', day: 'Thursday', period_no: 4,
    start_time: '11:30', end_time: '12:15', slot_type: 'instructional',
    class_id: 'CLASS_12', section_id: 'A', subject_id: 'APP_MATH',
    assignment_id: 'ASSIGN_006', teacher_id: 'T001', room_id: 'R16',
    effective_from: '2026-04-01', effective_to: '2027-03-31', status: 'active',
  },
  {
    slot_id: 'TT_005', academic_year: '2026-27', day: 'Thursday', period_no: 5,
    start_time: '12:15', end_time: '13:00', slot_type: 'instructional',
    class_id: 'CLASS_9', section_id: 'C', subject_id: 'MATH',
    assignment_id: 'ASSIGN_003', teacher_id: 'T001', room_id: 'R12',
    effective_from: '2026-04-01', effective_to: '2027-03-31', status: 'active',
  },
  {
    slot_id: 'TT_006', academic_year: '2026-27', day: 'Thursday', period_no: 6,
    start_time: '13:45', end_time: '14:30', slot_type: 'instructional',
    class_id: 'CLASS_10', section_id: 'A', subject_id: 'MATH',
    assignment_id: 'ASSIGN_002', teacher_id: 'T001', room_id: 'R14',
    effective_from: '2026-04-01', effective_to: '2027-03-31', status: 'active',
  },
];

// ── Resolve display labels ────────────────────────────────────────────────

const CLASS_LABELS: Record<string, string> = {
  CLASS_8: 'Class 8', CLASS_9: 'Class 9', CLASS_10: 'Class 10', CLASS_12: 'Class 12',
};
const SECTION_LABELS: Record<string, string> = {
  A: 'A', B: 'B', C: 'C',
};
const SUBJECT_NAMES: Record<string, string> = {
  MATH: 'Mathematics', SCI: 'Science', ENG: 'English', HIN: 'Hindi',
  SST: 'Social Science', APP_MATH: 'Applied Maths',
};

// Chapter/topic info per class-subject (mock current state)
const TOPIC_INFO: Record<string, { chapter: string; topic: string; chapterId: string; topicId: string }> = {
  'CLASS_8|SCI': { chapter: 'Coal & Petroleum', topic: 'Fractional distillation of crude oil', chapterId: 'SCI8_CH03', topicId: 'SCI8_CH03_T01' },
  'CLASS_8|MATH': { chapter: 'Rational Numbers', topic: 'Properties of Rational Numbers', chapterId: 'MATH8_CH01', topicId: 'MATH8_CH01_T01' },
  'CLASS_9|MATH': { chapter: 'Lines and Angles', topic: 'Recap: vertically opposite angles', chapterId: 'MATH9_CH06', topicId: 'MATH9_CH06_T01' },
  'CLASS_10|MATH': { chapter: 'Quadratic Equations', topic: 'Nature of Roots — Discriminant', chapterId: 'MATH10_CH04', topicId: 'MATH10_CH04_T03' },
  'CLASS_12|APP_MATH': { chapter: 'Integrals', topic: 'Integration by substitution', chapterId: 'APPMATH12_CH07', topicId: 'APPMATH12_CH07_T02' },
  'CLASS_10|MATH|ALT': { chapter: 'Quadratic Equations', topic: 'Practice set 4.3', chapterId: 'MATH10_CH04', topicId: 'MATH10_CH04_T04' },
  'CLASS_9|MATH|ALT': { chapter: 'Triangles', topic: 'Congruence criteria (SAS, ASA)', chapterId: 'MATH9_CH07', topicId: 'MATH9_CH07_T01' },
};

// Pacing per class-subject
const PACING: Record<string, 'on-track' | 'behind' | 'ahead'> = {
  'CLASS_8|SCI': 'on-track',
  'CLASS_9|MATH': 'on-track',
  'CLASS_10|MATH': 'on-track',
  'CLASS_12|APP_MATH': 'behind',
  'CLASS_10|MATH|ALT': 'on-track',
  'CLASS_9|MATH|ALT': 'on-track',
};

// Mock Resource Registry
const MOCK_RESOURCE_REGISTRY: Record<string, boolean> = {
  'SCI8_CH03_T01': true,
  'MATH8_CH01_T01': true,
  // Other topics do not have resources configured in the mock registry yet
};

function buildMockPeriods(now: Date): DashboardPeriod[] {
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeNum = currentHour * 60 + currentMinute;

  return BISHT_SLOTS.map((slot, idx) => {
    if (slot.slot_type === 'break') {
      return {
        slot,
        class_label: '',
        section_label: '',
        subject_name: '',
        chapter_title: '',
        topic_title: 'Short Break',
        chapter_id: '',
        topic_id: '',
        progress_status: 'not_started' as const,
        pacing: 'on-track' as const,
        resources: {
          has_lesson_plan: false, has_concept_map: false,
          has_homework: false, has_microtest: false, has_smart_board: false,
        },
        is_content_available: false,
      };
    }

    // Use ALT topic info for 2nd occurrence of same class-subject
    const baseKey = `${slot.class_id}|${slot.subject_id}`;
    const altKey = `${baseKey}|ALT`;
    const seenBefore = BISHT_SLOTS.slice(0, idx).some(
      s => s.class_id === slot.class_id && s.subject_id === slot.subject_id && s.slot_type === 'instructional'
    );
    const topicKey = seenBefore && TOPIC_INFO[altKey] ? altKey : baseKey;
    const info = TOPIC_INFO[topicKey] || { chapter: 'TBD', topic: 'TBD', chapterId: '', topicId: '' };
    
    // Check registry for this topic instead of hardcoded pilot list
    const hasContent = !!MOCK_RESOURCE_REGISTRY[info.topicId];

    // Determine period state based on current time
    const [sh, sm] = slot.start_time.split(':').map(Number);
    const [eh, em] = slot.end_time.split(':').map(Number);
    const startNum = sh * 60 + sm;
    const endNum = eh * 60 + em;

    let progressStatus: 'completed' | 'in_progress' | 'not_started' = 'not_started';
    if (currentTimeNum >= endNum) progressStatus = 'completed';
    else if (currentTimeNum >= startNum) progressStatus = 'in_progress';

    return {
      slot,
      class_label: CLASS_LABELS[slot.class_id] || slot.class_id,
      section_label: SECTION_LABELS[slot.section_id] || slot.section_id,
      subject_name: SUBJECT_NAMES[slot.subject_id] || slot.subject_id,
      chapter_title: info.chapter,
      topic_title: info.topic,
      chapter_id: info.chapterId,
      topic_id: info.topicId,
      progress_status: progressStatus,
      pacing: PACING[topicKey] || 'on-track',
      resources: {
        has_lesson_plan: hasContent,
        lesson_plan_url: hasContent ? `/content/${slot.class_id.toLowerCase().replace('class_', 'class-')}/${slot.subject_id.toLowerCase()}/lesson-plan.md` : undefined,
        has_concept_map: hasContent,
        concept_map_url: hasContent ? `/content/${slot.class_id.toLowerCase().replace('class_', 'class-')}/${slot.subject_id.toLowerCase()}/concept-map.json` : undefined,
        has_homework: hasContent,
        homework_set_id: hasContent ? `HW_${slot.class_id}_${slot.subject_id}_${info.chapterId}_01` : undefined,
        has_microtest: hasContent,
        microtest_class: hasContent ? slot.class_id.replace('CLASS_', '') : undefined,
        microtest_subject: hasContent ? SUBJECT_NAMES[slot.subject_id] : undefined,
        microtest_chapter: hasContent ? info.chapter : undefined,
        microtest_topic: hasContent ? info.topic : undefined,
        has_smart_board: false,
      },
      is_content_available: hasContent,
    };
  });
}

// ── Mock gateway responses ─────────────────────────────────────────────────

export function mockGetTeachers(): Teacher[] {
  return MOCK_TEACHERS;
}

export function mockGetDashboard(teacherId: string, date: string): DashboardData {
  const teacher = MOCK_TEACHERS.find(t => t.teacher_id === teacherId) || MOCK_TEACHERS[0];
  const now = new Date();
  const periods = buildMockPeriods(now);
  const teaching = periods.filter(p => p.slot.slot_type !== 'break');
  const completed = teaching.filter(p => p.progress_status === 'completed').length;
  const currentPeriod = teaching.find(p => p.progress_status === 'in_progress');

  return {
    teacher,
    date,
    academic_year: '2026-27',
    periods,
    summary: {
      total_teaching: teaching.length,
      completed,
      current_period_no: currentPeriod?.slot.period_no || 0,
    },
  };
}

export function mockGetPeriodContext(slotId: string): PeriodContext {
  const slot = BISHT_SLOTS.find(s => s.slot_id === slotId) || BISHT_SLOTS[0];
  const baseKey = `${slot.class_id}|${slot.subject_id}`;
  const info = TOPIC_INFO[baseKey] || { chapter: 'TBD', topic: 'TBD', chapterId: '', topicId: '' };

  const progress: TeachingProgressSummary = {
    summary_id: `TPS_${slotId}`,
    academic_year: '2026-27',
    class_id: slot.class_id,
    section_id: slot.section_id,
    subject_id: slot.subject_id,
    current_chapter_id: info.chapterId,
    current_topic_id: info.topicId,
    current_chapter_title: info.chapter,
    current_topic_title: info.topic,
    teacher_id: slot.teacher_id,
    status: 'in_progress',
    last_taught_date: new Date().toISOString().split('T')[0],
    last_updated: new Date().toISOString().split('T')[0],
  };

  const planned: TeachingPlanItem[] = [
    { plan_id: 'PLAN_0', academic_year: '2026-27', class_id: slot.class_id, subject_id: slot.subject_id, sequence_no: 0, chapter_id: info.chapterId, topic_id: info.topicId + '_PREV', topic_title: 'Previous Topic', planned_periods: 2, planned_week: 1, status: 'active', status_type: 'past_incomplete' },
    { plan_id: 'PLAN_1', academic_year: '2026-27', class_id: slot.class_id, subject_id: slot.subject_id, sequence_no: 1, chapter_id: info.chapterId, topic_id: info.topicId, topic_title: info.topic, planned_periods: 2, planned_week: 1, status: 'active', status_type: 'current' },
    { plan_id: 'PLAN_2', academic_year: '2026-27', class_id: slot.class_id, subject_id: slot.subject_id, sequence_no: 2, chapter_id: info.chapterId, topic_id: info.topicId + '_NEXT', topic_title: 'Next Topic in sequence', planned_periods: 2, planned_week: 2, status: 'active', status_type: 'upcoming' },
  ];

  const topicProgress: TopicProgress[] = [
    { progress_id: 'TP_1', academic_year: '2026-27', class_id: slot.class_id, section_id: slot.section_id, subject_id: slot.subject_id, chapter_id: info.chapterId, topic_id: info.topicId, status: 'in_progress', completed_by_teacher_id: '', completed_on: '', last_updated: new Date().toISOString().split('T')[0] },
  ];

  return { slot, progress, planned_topics: planned, topic_progress: topicProgress, resources: [] };
}

export function mockGetHomework(_classId: string, _subjectId: string, _topicId: string): { set: HomeworkSet; items: HomeworkItem[] } | null {
  return {
    set: {
      homework_set_id: `HW_${_classId}_${_subjectId}_${_topicId}`, class_id: _classId, subject_id: _subjectId,
      chapter_id: '', topic_id: _topicId, subtopic_id: '',
      title: `${_subjectId} Practice for ${_topicId}`, source_mode: 'question_bank',
      total_questions: 3, estimated_minutes: 15, status: 'active',
    },
    items: [
      { homework_item_id: 'HWI_001', homework_set_id: `HW_${_topicId}`, source_type: 'manual', question_id: '', question_text: `What is the primary significance of ${_topicId}?`, marks: 2, difficulty: 'Easy', sequence_no: 1 },
      { homework_item_id: 'HWI_002', homework_set_id: `HW_${_topicId}`, source_type: 'manual', question_id: '', question_text: `Explain how ${_topicId} relates to real-world applications.`, marks: 3, difficulty: 'Medium', sequence_no: 2 },
      { homework_item_id: 'HWI_003', homework_set_id: `HW_${_topicId}`, source_type: 'manual', question_id: '', question_text: `Evaluate a complex scenario involving the principles of ${_topicId}.`, marks: 5, difficulty: 'Hard', sequence_no: 3 },
    ],
  };
}

/** My Classes list for sidebar — derived from Mrs. Bisht's assignments */
export function mockGetTeacherClasses(teacherId: string): string[] {
  if (teacherId === 'T001') {
    return ['Class 10-B · Maths', 'Class 10-A · Maths', 'Class 9-C · Maths', 'Class 12-A · Applied Maths', 'Class 8-A · Science'];
  }
  return ['Class 8-A · Maths'];
}

/** Teaching load per day of week (for LoadCard widget) */
export function mockGetTeachingLoad(_teacherId: string): { day: string; periods: number }[] {
  return [
    { day: 'Mon', periods: 5 },
    { day: 'Tue', periods: 4 },
    { day: 'Wed', periods: 6 },
    { day: 'Thu', periods: 6 },
    { day: 'Fri', periods: 4 },
    { day: 'Sat', periods: 2 },
  ];
}

export function mockGetLessonPlan(classId: string, subjectId: string, topicId: string): LessonPlan | null {
  return {
    id: `LP_${classId}_${subjectId}_${topicId}`,
    chapterTitle: 'Lines and Angles',
    subject: subjectId === 'MATH' ? 'Mathematics' : (subjectId === 'SCI' ? 'Science' : subjectId),
    klass: classId.replace('CLASS_', ''),
    duration: '2 Periods',
    objectives: [
      'Identify acute, obtuse, right, straight and reflex angles.',
      'Prove and apply the Vertically Opposite Angles theorem.',
      'Identify adjacent angles and linear pairs of angles.'
    ],
    phases: {
      engage: 'Show pictures of scissors opening, railway crossings, and bridges. Ask students to spot intersecting lines and point out pairs of angles.',
      explore: 'Distribute protractors and have students draw two intersecting lines, measure all four angles, and tabulate their findings.',
      explain: 'Define vertically opposite angles. Prove the theorem: If two lines intersect, then the vertically opposite angles are equal. Introduce linear pairs of angles.',
      elaborate: 'Solve standard NCERT problems involving intersecting lines where unknown angle variables must be deduced algebraically.',
      evaluate: 'Conduct a 5-minute exit ticket with two questions: one finding a vertically opposite angle, one verifying a linear pair relationship.'
    },
    resources: [
      'NCERT Class 9 Mathematics Textbook, Chapter 6',
      'Geometry boxes (protractors, rulers)',
      'Exit-ticket worksheets'
    ]
  };
}

export function mockGetConcept(classId: string, subjectId: string, topicId: string): Concept | null {
  return {
    id: `CON_${classId}_${subjectId}_${topicId}`,
    title: 'Vertically Opposite & Linear Pair Angles',
    explanation: 'When two straight lines intersect, they form four angles. The angles opposite to each other are called vertically opposite angles and are always equal. Adjacent angles that form a straight line add up to 180 degrees and are called a linear pair.',
    key_formulas: [
      '\\angle AOD = \\angle BOC \\quad \\text{(Vertically Opposite)}',
      '\\angle AOC + \\angle BOC = 180^\\circ \\quad \\text{(Linear Pair)}'
    ],
    misconceptions: [
      'Assuming all adjacent angles add up to 180 degrees (only true if their non-common arms form a straight line).',
      'Thinking vertically opposite angles are only equal when the lines intersect at 90 degrees.'
    ]
  };
}

