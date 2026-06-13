/**
 * SAH Command Center - Single Gateway
 * To be deployed as a web app attached to the "SAH Central Control" Google Spreadsheet.
 */

// Global constant to refer to the central control spreadsheet ID
// In production, this can be retrieved via SpreadsheetApp.getActiveSpreadsheet().getId()
// if attached, or hardcoded if detached.
const CENTRAL_CONTROL_SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  try {
    let action;
    let params;

    if (method === 'GET') {
      action = e.parameter.action;
      params = e.parameter;
    } else {
      const payload = JSON.parse(e.postData.contents);
      action = payload.action;
      params = payload.payload || {};
    }

    if (!action) {
      throw new Error('No action provided');
    }

    let result;
    switch (action) {
      case 'getTeachers':
        result = getTeachers();
        break;
      case 'getDashboard':
        result = getDashboard(params.teacher_id, params.date);
        break;
      case 'getPeriodContext':
        result = getPeriodContext(params.slot_id, params.date);
        break;
      case 'getHomework':
        result = getHomework(params.class_id, params.subject_id, params.topic_id);
        break;
      case 'markPeriodDone':
        result = markPeriodDone(params);
        break;
      case 'getTeacherClasses':
        result = getTeacherClasses(params.teacher_id);
        break;
      case 'getTeachingLoad':
        result = getTeachingLoad(params.teacher_id);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return createResponse(result);
  } catch (error) {
    return createResponse({ ok: false, error: error.toString() }, true);
  }
}

function createResponse(data, isError = false) {
  return ContentService.createTextOutput(JSON.stringify(isError ? data : data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Helpers ─────────────────────────────────────────────────────────────

function getCentralSheet(sheetName) {
  return SpreadsheetApp.openById(CENTRAL_CONTROL_SPREADSHEET_ID).getSheetByName(sheetName);
}

function getRows(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const rowObj = {};
    for (let j = 0; j < headers.length; j++) {
      rowObj[headers[j]] = data[i][j];
    }
    rows.push(rowObj);
  }
  return rows;
}

// ── Read Actions ─────────────────────────────────────────────────────────

function getTeachers() {
  const sheet = getCentralSheet('teachers');
  const rows = getRows(sheet);
  return rows.filter(r => r.status === 'active');
}

function getTeacherClasses(teacher_id) {
  const sheet = getCentralSheet('section_subject_assignments');
  const rows = getRows(sheet);
  const classes = rows
    .filter(r => r.teacher_id === teacher_id && r.status === 'active')
    .map(r => `Class ${r.class_id.replace('CLASS_', '')}-${r.section_id} · ${r.subject_id}`);
  return Array.from(new Set(classes));
}

function getTeachingLoad(teacher_id) {
  const sheet = getCentralSheet('timetable_slots');
  const rows = getRows(sheet);
  const mySlots = rows.filter(r => r.teacher_id === teacher_id && r.slot_type === 'instructional' && r.status === 'active');
  const counts = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0 };
  mySlots.forEach(s => {
    if (counts[s.day] !== undefined) counts[s.day]++;
  });
  return [
    { day: 'Mon', periods: counts.Monday },
    { day: 'Tue', periods: counts.Tuesday },
    { day: 'Wed', periods: counts.Wednesday },
    { day: 'Thu', periods: counts.Thursday },
    { day: 'Fri', periods: counts.Friday },
    { day: 'Sat', periods: counts.Saturday },
  ];
}

function getDashboard(teacher_id, date) {
  const d = new Date(date);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[d.getDay()];

  // 1. Get teacher slots for this day
  const slotsSheet = getCentralSheet('timetable_slots');
  const allSlots = getRows(slotsSheet);
  const todaySlots = allSlots.filter(s => s.teacher_id === teacher_id && s.day === dayName && s.status === 'active');

  // 2. Sort by period_no
  todaySlots.sort((a, b) => a.period_no - b.period_no);

  // 3. For each slot, build the DashboardPeriod object
  const teachers = getTeachers();
  const teacher = teachers.find(t => t.teacher_id === teacher_id) || { teacher_id, teacher_name: 'Unknown', short_name: '?' };
  
  const periods = todaySlots.map(slot => {
    if (slot.slot_type === 'break') {
      return {
        slot,
        class_label: '', section_label: '', subject_name: '', chapter_title: '',
        topic_title: 'Short Break', chapter_id: '', topic_id: '',
        progress_status: 'not_started', pacing: 'on-track',
        resources: {
          has_lesson_plan: false, has_concept_map: false,
          has_homework: false, has_microtest: false, has_smart_board: false
        },
        is_content_available: false
      };
    }

    // Mock progress and pacing for now, since we aren't joining the full schema yet in this MVP Gateway snippet.
    // In production, this would look up `teaching_progress_summary` and `resource_registry`.
    return {
      slot,
      class_label: slot.class_id.replace('CLASS_', ''),
      section_label: slot.section_id,
      subject_name: slot.subject_id,
      chapter_title: 'Chapter details (pending)',
      topic_title: 'Topic details (pending)',
      chapter_id: 'CH_01',
      topic_id: 'T_01',
      progress_status: 'not_started', // or in_progress / completed based on time
      pacing: 'on-track',
      resources: {
        has_lesson_plan: true,
        lesson_plan_url: '#',
        has_concept_map: false,
        has_homework: true,
        homework_set_id: 'HW_TEST',
        has_microtest: true,
        microtest_class: slot.class_id.replace('CLASS_', ''),
        microtest_subject: slot.subject_id === 'MATH' ? 'Mathematics' : 'Science',
        microtest_chapter: '',
        microtest_topic: '',
        has_smart_board: false
      },
      is_content_available: slot.class_id === 'CLASS_8' // Mocking pilot class behavior
    };
  });

  return {
    teacher,
    date,
    academic_year: '2026-27',
    periods,
    summary: {
      total_teaching: periods.filter(p => p.slot.slot_type === 'instructional').length,
      completed: 0,
      current_period_no: 1
    }
  };
}

function getPeriodContext(slot_id, date) {
  // Mock context data for now.
  // In production, queries teaching_plan, teaching_progress_summary, and topic_progress.
  const slotsSheet = getCentralSheet('timetable_slots');
  const allSlots = getRows(slotsSheet);
  const slot = allSlots.find(s => s.slot_id === slot_id);

  if (!slot) throw new Error("Slot not found");

  return {
    slot,
    progress: {
      current_chapter_id: 'CH_01',
      current_topic_id: 'T_01',
      current_chapter_title: 'Sample Chapter',
      current_topic_title: 'Sample Topic',
    },
    planned_topics: [
      { topic_id: 'T_01', planned_week: 1 },
      { topic_id: 'T_02', planned_week: 1 }
    ],
    topic_progress: [],
    resources: []
  };
}

function getHomework(class_id, subject_id, topic_id) {
  // Mock homework. In prod, queries homework_sets and homework_items.
  return {
    set: {
      homework_set_id: 'HW_1',
      total_questions: 3,
      estimated_minutes: 15
    },
    items: [
      { homework_item_id: 'I1', question_text: 'Sample homework question 1?', marks: 2, difficulty: 'Easy' },
      { homework_item_id: 'I2', question_text: 'Sample homework question 2?', marks: 3, difficulty: 'Medium' }
    ]
  };
}

// ── Write Actions ────────────────────────────────────────────────────────

function markPeriodDone(payload) {
  const sheet = getCentralSheet('period_completion_log');
  if (!sheet) throw new Error("Period completion log sheet not found");

  // Format: log_id, academic_year, date, slot_id, class_id, section_id, subject_id, teacher_id, chapter_id, topic_ids_completed, action_type, notes, timestamp
  const log_id = 'LOG_' + Date.now();
  const timestamp = new Date().toISOString();
  
  sheet.appendRow([
    log_id,
    '2026-27', // Hardcoded for now
    payload.date,
    payload.slot_id,
    payload.class_id,
    payload.section_id,
    payload.subject_id,
    payload.teacher_id,
    payload.chapter_id,
    payload.topic_ids_completed.join(','),
    payload.action_type,
    payload.notes || '',
    timestamp
  ]);

  return { ok: true };
}
