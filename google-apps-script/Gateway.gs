/**
 * SAH Command Center - Single Gateway
 * To be deployed as a web app attached to the "SAH_Command_Center_Control" Google Spreadsheet.
 */

// Paste the spreadsheet ID here if not using Google Apps Script Properties service
const CONTROL_SPREADSHEET_ID = "";

// Minimum Phase 1 tabs required for the command center to start.
// Content tabs (curriculum, plans, resources) are now resolved from subject workbooks.
const REQUIRED_TABS = [
  "teachers",
  "classes",
  "sections",
  "subjects",
  "section_subject_assignments",
  "timetable_slots",
  "academic_calendar",
  "app_registry",
  "topic_progress",
  "teaching_progress_summary",
  "period_completion_log"
];

const OPTIONAL_TABS = [
  "question_bank_map",
  "homework_assignments",
  "microtest_log",
  "question_usage_log"
];

let CENTRAL_CONTROL_SPREADSHEET_ID_CACHE = null;

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
      case 'health':
        result = health();
        break;
      case 'testCentralWorkbook':
        result = testCentralWorkbook();
        break;
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
      case 'getBank':
        result = getBank(params.classLevel, params.subject);
        break;
      case 'getLessonPlan':
        result = getLessonPlan(params.class_id, params.subject_id, params.topic_id);
        break;
      case 'getConcept':
        result = getConcept(params.class_id, params.subject_id, params.topic_id);
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

function getCentralSpreadsheet() {
  // 1. Try script property 'CONTROL_SPREADSHEET_ID' or global constant
  try {
    const propId = PropertiesService.getScriptProperties().getProperty('CONTROL_SPREADSHEET_ID') || CONTROL_SPREADSHEET_ID;
    if (propId && propId.trim()) {
      CENTRAL_CONTROL_SPREADSHEET_ID_CACHE = propId.trim();
      return SpreadsheetApp.openById(CENTRAL_CONTROL_SPREADSHEET_ID_CACHE);
    }
  } catch (e) {
    // Ignore and proceed
  }

  // 2. Try active bound spreadsheet
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) {
      CENTRAL_CONTROL_SPREADSHEET_ID_CACHE = active.getId();
      return active;
    }
  } catch (e) {
    // Ignore bound error and fallback
  }

  // 3. Try cached ID
  if (CENTRAL_CONTROL_SPREADSHEET_ID_CACHE) {
    try {
      return SpreadsheetApp.openById(CENTRAL_CONTROL_SPREADSHEET_ID_CACHE);
    } catch (e) {}
  }

  // 4. Search Drive by name
  try {
    const files = DriveApp.getFilesByName("SAH_Command_Center_Control");
    if (files.hasNext()) {
      const file = files.next();
      CENTRAL_CONTROL_SPREADSHEET_ID_CACHE = file.getId();
      return SpreadsheetApp.openById(CENTRAL_CONTROL_SPREADSHEET_ID_CACHE);
    }
  } catch (e) {}

  throw new Error("Unable to locate central workbook. Set Script Property or constant 'CONTROL_SPREADSHEET_ID', bind the script, or grant Drive permissions.");
}

function getCentralSheet(sheetName) {
  const ss = getCentralSpreadsheet();
  return ss.getSheetByName(sheetName);
}

function getRows(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0].map(h => String(h || '').trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const rowObj = {};
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) {
        rowObj[headers[j]] = data[i][j];
      }
    }
    rows.push(rowObj);
  }
  return rows;
}

function getActiveAcademicYear() {
  const sheet = getCentralSheet('academic_calendar');
  if (sheet) {
    const rows = getRows(sheet);
    const activeRow = rows.find(r => String(r.status || '').trim().toLowerCase() === 'active');
    if (activeRow && activeRow.academic_year) {
      return String(activeRow.academic_year).trim();
    }
    if (rows.length > 0 && rows[0].academic_year) {
      return String(rows[0].academic_year).trim();
    }
  }
  return '2026-27'; // Fallback
}

function getSubjectWorkbookRegistry(class_id, subject_id, academic_year) {
  const sheet = getCentralSheet('app_registry');
  if (!sheet) return null;
  const rows = getRows(sheet);
  
  // Strict lookup logic
  const match = rows.find(r => 
    String(r.academic_year || '').trim() === String(academic_year || '').trim() &&
    String(r.class_id || '').trim() === String(class_id || '').trim() &&
    String(r.subject_id || '').trim() === String(subject_id || '').trim() &&
    String(r.status || '').trim().toLowerCase() === 'active'
  );
  return match || null;
}

function isPlaceholderSpreadsheetId(id) {
  return !id || id.indexOf("PASTE_") !== -1 || id.indexOf("SPREADSHEET_ID") !== -1;
}

// ── Request-Scope Subject Workbook Cache ──────────────────────────────────

const _subjectWorkbookCache = {};
const _cachedSubjectRows = {};

function getSubjectWorkbook(class_id, subject_id) {
  const key = class_id + '_' + subject_id;
  if (_subjectWorkbookCache[key]) {
    return _subjectWorkbookCache[key];
  }
  const academic_year = getActiveAcademicYear();
  const registry = getSubjectWorkbookRegistry(class_id, subject_id, academic_year);
  if (!registry || isPlaceholderSpreadsheetId(registry.spreadsheet_id)) {
    return null;
  }
  try {
    const ss = SpreadsheetApp.openById(registry.spreadsheet_id);
    _subjectWorkbookCache[key] = ss;
    return ss;
  } catch (e) {
    return null;
  }
}

function getSubjectSheet(class_id, subject_id, sheetName) {
  const ss = getSubjectWorkbook(class_id, subject_id);
  if (!ss) return null;
  return ss.getSheetByName(sheetName);
}

function getCachedSubjectData(class_id, subject_id) {
  const key = class_id + '_' + subject_id;
  if (_cachedSubjectRows[key]) return _cachedSubjectRows[key];

  const chSheet = getSubjectSheet(class_id, subject_id, 'Chapter_Map');
  const topSheet = getSubjectSheet(class_id, subject_id, 'Topic_Map');
  const resSheet = getSubjectSheet(class_id, subject_id, 'Resources');
  const lpSheet = getSubjectSheet(class_id, subject_id, 'Lesson_Plans');
  const conSheet = getSubjectSheet(class_id, subject_id, 'Concepts');
  const hwSheet = getSubjectSheet(class_id, subject_id, 'Homework');

  const data = {
    chapters: chSheet ? getRows(chSheet) : [],
    topics: topSheet ? getRows(topSheet) : [],
    resources: resSheet ? getRows(resSheet) : [],
    lessonPlans: lpSheet ? getRows(lpSheet) : [],
    concepts: conSheet ? getRows(conSheet) : [],
    homework: hwSheet ? getRows(hwSheet) : []
  };
  _cachedSubjectRows[key] = data;
  return data;
}

// ── Diagnostics Actions ──────────────────────────────────────────────────

function health() {
  return {
    ok: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  };
}

function testCentralWorkbook() {
  try {
    const ss = getCentralSpreadsheet();
    const sheets = ss.getSheets();
    const existingNames = sheets.map(s => s.getName());
    
    const exists = [];
    const missing = [];
    const optionalExists = [];
    const optionalMissing = [];
    
    REQUIRED_TABS.forEach(tab => {
      if (existingNames.indexOf(tab) !== -1) {
        exists.push(tab);
      } else {
        missing.push(tab);
      }
    });

    OPTIONAL_TABS.forEach(tab => {
      if (existingNames.indexOf(tab) !== -1) {
        optionalExists.push(tab);
      } else {
        optionalMissing.push(tab);
      }
    });
    
    return {
      ok: missing.length === 0,
      details: {
        spreadsheet_name: ss.getName(),
        spreadsheet_id: ss.getId(),
        exists: exists,
        missing: missing,
        optional_exists: optionalExists,
        optional_missing: optionalMissing
      }
    };
  } catch (error) {
    return {
      ok: false,
      error: 'Failed to access central workbook: ' + error.toString(),
      details: {
        spreadsheet_id: CENTRAL_CONTROL_SPREADSHEET_ID_CACHE,
        exists: [],
        missing: REQUIRED_TABS,
        optional_exists: [],
        optional_missing: OPTIONAL_TABS
      }
    };
  }
}

// ── Read Actions ─────────────────────────────────────────────────────────

function getTeachers() {
  const sheet = getCentralSheet('teachers');
  const rows = getRows(sheet);
  return rows.filter(r => String(r.status || '').trim().toLowerCase() === 'active');
}

function getTeacherClasses(teacher_id) {
  const academic_year = getActiveAcademicYear();
  const sheet = getCentralSheet('section_subject_assignments');
  const rows = getRows(sheet);
  const classes = rows
    .filter(r => 
      r.teacher_id === teacher_id && 
      String(r.status || '').trim().toLowerCase() === 'active' &&
      String(r.academic_year || '').trim() === academic_year
    )
    .map(r => `Class ${r.class_id.replace('CLASS_', '')}-${r.section_id} · ${r.subject_id}`);
  return Array.from(new Set(classes));
}

function getTeachingLoad(teacher_id) {
  const academic_year = getActiveAcademicYear();
  const sheet = getCentralSheet('timetable_slots');
  const rows = getRows(sheet);
  const mySlots = rows.filter(r => 
    r.teacher_id === teacher_id && 
    r.slot_type === 'instructional' && 
    String(r.status || '').trim().toLowerCase() === 'active' &&
    String(r.academic_year || '').trim() === academic_year
  );
  const counts = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0 };
  mySlots.forEach(s => {
    const day = String(s.day || '').trim();
    const normalizedDay = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
    if (counts[normalizedDay] !== undefined) counts[normalizedDay]++;
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

  const academic_year = getActiveAcademicYear();

  // 1. Get teacher slots for this day
  const slotsSheet = getCentralSheet('timetable_slots');
  const allSlots = getRows(slotsSheet);
  const todaySlots = allSlots.filter(s => 
    s.teacher_id === teacher_id && 
    s.day === dayName && 
    String(s.status || '').trim().toLowerCase() === 'active' &&
    String(s.academic_year || '').trim() === academic_year
  );

  // 2. Sort by period_no
  todaySlots.sort((a, b) => Number(a.period_no || 0) - Number(b.period_no || 0));

  // 3. Get teachers
  const teachers = getTeachers();
  const teacher = teachers.find(t => t.teacher_id === teacher_id) || { teacher_id, teacher_name: 'Unknown', short_name: '?' };

  // 4. Load other tables for dynamic resolution (No Mocks!)
  const progressSheet = getCentralSheet('teaching_progress_summary');
  const progressRows = getRows(progressSheet).filter(r => String(r.academic_year || '').trim() === academic_year);

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

    const classId = slot.class_id;
    const sectionId = slot.section_id;
    const subjectId = slot.subject_id;

    // Load subject workbook data via cached lookup
    const subData = getCachedSubjectData(classId, subjectId);
    const planRows = subData.topics.slice().sort((a, b) => Number(a.sequence_no || 0) - Number(b.sequence_no || 0));
    const curriculumRows = subData.chapters;

    // Find progress summary
    const summary = progressRows.find(r => 
      r.class_id === classId && 
      r.section_id === sectionId && 
      r.subject_id === subjectId
    );

    let chapterId = '';
    let topicId = '';
    let progressStatus = 'not_started';
    let pacing = 'on-track';

    if (summary) {
      chapterId = summary.current_chapter_id || '';
      topicId = summary.current_topic_id || '';
      progressStatus = summary.status || 'not_started';
      pacing = summary.pacing || 'on-track';
    } else {
      // Fallback to first planned topic
      if (planRows.length > 0) {
        chapterId = planRows[0].chapter_id || '';
        topicId = planRows[0].topic_id || '';
      }
    }

    // Resolve titles dynamically
    let chapterTitle = '';
    let topicTitle = '';

    if (chapterId) {
      const curRow = curriculumRows.find(r => r.chapter_id === chapterId);
      if (curRow) {
        chapterTitle = curRow.chapter_title || '';
      }
    }
    if (topicId) {
      const planRow = planRows.find(r => r.topic_id === topicId);
      if (planRow) {
        topicTitle = planRow.topic_title || '';
        if (!chapterTitle && planRow.chapter_id) {
          const curRow = curriculumRows.find(r => r.chapter_id === planRow.chapter_id);
          if (curRow) chapterTitle = curRow.chapter_title || '';
        }
      }
    }

    // Resolve resource existence
    const hasLessonPlan = subData.lessonPlans.some(r => r.topic_id === topicId);
    const hasConceptMap = subData.concepts.some(r => r.topic_id === topicId);
    const hasHomework = subData.homework.some(r => r.topic_id === topicId);

    const smartBoardRes = subData.resources.find(r => r.topic_id === topicId && r.resource_type === 'smart_board');
    const microtestRes = subData.resources.find(r => r.topic_id === topicId && r.resource_type === 'microtest');

    const resources = {
      has_lesson_plan: hasLessonPlan,
      lesson_plan_url: hasLessonPlan ? 'nativelink' : '',
      has_concept_map: hasConceptMap,
      concept_map_url: hasConceptMap ? 'nativelink' : '',
      has_homework: hasHomework,
      homework_set_id: hasHomework ? ('HW_SET_' + topicId) : '',
      has_microtest: !!microtestRes || hasLessonPlan || hasConceptMap || hasHomework,
      microtest_class: slot.class_id.replace('CLASS_', ''),
      microtest_subject: (slot.subject_id === 'MATH' || slot.subject_id === 'MATHEMATICS') ? 'Mathematics' : ((slot.subject_id === 'SCI' || slot.subject_id === 'SCIENCE') ? 'Science' : slot.subject_id),
      microtest_chapter: chapterId,
      microtest_topic: topicId,
      has_smart_board: !!smartBoardRes,
      smart_board_url: smartBoardRes ? (smartBoardRes.url || '') : ''
    };

    return {
      slot,
      class_label: slot.class_id.replace('CLASS_', ''),
      section_label: slot.section_id,
      subject_name: slot.subject_id,
      chapter_title: chapterTitle,
      topic_title: topicTitle,
      chapter_id: chapterId,
      topic_id: topicId,
      progress_status: progressStatus,
      pacing: pacing,
      resources: resources,
      is_content_available: !!(chapterId && topicId)
    };
  });

  return {
    teacher,
    date,
    academic_year,
    periods,
    summary: {
      total_teaching: periods.filter(p => p.slot.slot_type === 'instructional').length,
      completed: 0,
      current_period_no: periods.length > 0 ? Number(periods[0].slot.period_no || 1) : 1
    }
  };
}

function getPeriodContext(slot_id, date) {
  const slotsSheet = getCentralSheet('timetable_slots');
  const allSlots = getRows(slotsSheet);
  const slot = allSlots.find(s => s.slot_id === slot_id);
  if (!slot) throw new Error("Slot not found");

  const academic_year = getActiveAcademicYear();

  const summarySheet = getCentralSheet('teaching_progress_summary');
  const summaries = getRows(summarySheet);
  const summary = summaries.find(s => 
    s.class_id === slot.class_id && 
    s.subject_id === slot.subject_id && 
    s.section_id === slot.section_id &&
    String(s.academic_year || '').trim() === academic_year
  );
  
  const subData = getCachedSubjectData(slot.class_id, slot.subject_id);
  const planRows = subData.topics.slice().sort((a, b) => Number(a.sequence_no || 0) - Number(b.sequence_no || 0));
  const curriculumRows = subData.chapters;

  let current_topic_id = '';
  let current_chapter_id = '';

  if (summary) {
    current_topic_id = summary.current_topic_id || '';
    current_chapter_id = summary.current_chapter_id || '';
  } else if (planRows.length > 0) {
    current_topic_id = planRows[0].topic_id || '';
    current_chapter_id = planRows[0].chapter_id || '';
  }

  // Resolve titles dynamically
  let current_chapter_title = '';
  let current_topic_title = '';

  if (current_chapter_id) {
    const curRow = curriculumRows.find(r => r.chapter_id === current_chapter_id);
    if (curRow) current_chapter_title = curRow.chapter_title || '';
  }

  if (current_topic_id) {
    const planRow = planRows.find(r => r.topic_id === current_topic_id);
    if (planRow) {
      current_topic_title = planRow.topic_title || '';
      if (!current_chapter_title && planRow.chapter_id) {
        const curRow = curriculumRows.find(r => r.chapter_id === planRow.chapter_id);
        if (curRow) current_chapter_title = curRow.chapter_title || '';
      }
    }
  }

  let planned_topics = [];

  if (planRows.length > 0) {
    const tpSheet = getCentralSheet('topic_progress');
    const tpRows = getRows(tpSheet).filter(r => 
      r.class_id === slot.class_id && 
      r.subject_id === slot.subject_id && 
      r.section_id === slot.section_id &&
      String(r.status || '').trim().toLowerCase() === 'completed' &&
      String(r.academic_year || '').trim() === academic_year
    );
    const completedTopics = new Set(tpRows.map(r => r.topic_id));
    
    let currentIndex = planRows.findIndex(r => r.topic_id === current_topic_id);
    if (currentIndex === -1) currentIndex = 0;

    let candidates = [];

    // 1. Incomplete earlier topics
    for (let i = 0; i < currentIndex; i++) {
      if (!completedTopics.has(planRows[i].topic_id)) {
        let r = Object.assign({}, planRows[i], { status_type: 'past_incomplete' });
        candidates.push(r);
      }
    }
    
    // 2. Current topic
    if (planRows[currentIndex]) {
      let r = Object.assign({}, planRows[currentIndex], { status_type: 'current' });
      candidates.push(r);
    }

    // 3. Next 3 planned topics
    let addedFuture = 0;
    for (let i = currentIndex + 1; i < planRows.length && addedFuture < 3; i++) {
      let r = Object.assign({}, planRows[i], { status_type: 'upcoming' });
      candidates.push(r);
      addedFuture++;
    }

    planned_topics = candidates.map(r => ({
      topic_id: r.topic_id,
      topic_title: r.topic_title || r.topic_id,
      planned_week: Math.ceil(Number(r.sequence_no || 1) / 3),
      sequence_no: Number(r.sequence_no),
      status_type: r.status_type
    }));
  }

  const tpSheet = getCentralSheet('topic_progress');
  const tpRows = getRows(tpSheet).filter(r => 
    r.class_id === slot.class_id && 
    r.subject_id === slot.subject_id && 
    r.section_id === slot.section_id &&
    String(r.academic_year || '').trim() === academic_year
  );

  return {
    slot,
    progress: {
      current_chapter_id: current_chapter_id,
      current_topic_id: current_topic_id,
      current_chapter_title: current_chapter_title,
      current_topic_title: current_topic_title,
    },
    planned_topics: planned_topics,
    topic_progress: tpRows,
    resources: subData.resources.filter(r => 
      (!current_chapter_id || r.chapter_id === current_chapter_id) && 
      (!current_topic_id || r.topic_id === current_topic_id)
    )
  };
}

function getHomework(class_id, subject_id, topic_id) {
  const sheet = getSubjectSheet(class_id, subject_id, 'Homework');
  if (!sheet) {
    return {
      ok: true,
      warnings: ["Homework sheet not found in subject workbook for " + (class_id || '') + " " + (subject_id || '')],
      set: null,
      items: []
    };
  }
  const rows = getRows(sheet);
  const activeItems = rows
    .filter(r => r.topic_id === topic_id && String(r.status || '').trim().toLowerCase() === 'active')
    .sort((a, b) => Number(a.sequence_no || 0) - Number(b.sequence_no || 0));

  if (activeItems.length === 0) {
    return { ok: true, set: null, items: [] };
  }

  const first = activeItems[0];
  const set_id = 'HW_SET_' + topic_id;
  const set_title = first.set_title || ('Practice: ' + topic_id);

  const items = activeItems.map(r => ({
    homework_item_id: r.homework_id,
    question_text: r.question_text,
    marks: Number(r.marks || 1),
    difficulty: r.difficulty || 'Medium',
    answer: r.answer || '',
    explanation: r.explanation || ''
  }));

  return {
    ok: true,
    set: {
      homework_set_id: set_id,
      title: set_title,
      total_questions: items.length,
      estimated_minutes: items.length * 5
    },
    items: items
  };
}

function getBank(class_id, subject_id) {
  // Normalize parameters
  let resolvedClassId = class_id;
  if (resolvedClassId && resolvedClassId.indexOf("CLASS_") === -1) {
    resolvedClassId = "CLASS_" + resolvedClassId;
  }
  let resolvedSubjectId = subject_id;
  if (resolvedSubjectId) {
    const sUpper = resolvedSubjectId.trim().toUpperCase();
    if (sUpper === 'MATHEMATICS' || sUpper === 'MATHS' || sUpper === 'MATH') resolvedSubjectId = 'MATH';
    else if (sUpper === 'SCIENCE' || sUpper === 'SCI') resolvedSubjectId = 'SCI';
    else if (sUpper === 'ENGLISH' || sUpper === 'ENG') resolvedSubjectId = 'ENG';
  }

  const qSheet = getSubjectSheet(resolvedClassId, resolvedSubjectId, 'Questions');
  const chSheet = getSubjectSheet(resolvedClassId, resolvedSubjectId, 'Chapter_Map');

  if (!qSheet) {
    return {
      ok: true,
      questions: [],
      chapters: [],
      warnings: ["Questions sheet not found in subject workbook for " + (resolvedClassId || '') + " " + (resolvedSubjectId || '')]
    };
  }

  const questions = getRows(qSheet);
  const chapters = chSheet ? getRows(chSheet).map(ch => ({
    classLevel: resolvedClassId.replace('CLASS_', ''),
    subject: resolvedSubjectId,
    chapterNumber: Number(ch.chapter_no || 0),
    chapterName: ch.chapter_title || '',
    section: ''
  })) : [];

  return {
    ok: true,
    questions: questions,
    chapters: chapters
  };
}

function getLessonPlan(class_id, subject_id, topic_id) {
  const sheet = getSubjectSheet(class_id, subject_id, 'Lesson_Plans');
  if (!sheet) {
    return {
      ok: true,
      warnings: ["Lesson_Plans sheet not found in subject workbook for " + class_id + " " + subject_id],
      plan: null
    };
  }
  const rows = getRows(sheet);
  const plan = rows.find(r => r.topic_id === topic_id);
  if (!plan) {
    return { ok: true, plan: null };
  }

  const objectives = plan.objectives ? plan.objectives.split(';').map(s => s.trim()).filter(s => s.length > 0) : [];
  const resources = plan.required_resources ? plan.required_resources.split(';').map(s => s.trim()).filter(s => s.length > 0) : [];

  return {
    ok: true,
    plan: {
      id: plan.lesson_plan_id,
      chapterTitle: plan.chapter_title || '',
      subject: subject_id,
      klass: class_id.replace('CLASS_', ''),
      duration: plan.duration || '1 Period',
      objectives: objectives,
      phases: {
        engage: plan.phase_engage || '',
        explore: plan.phase_explore || '',
        explain: plan.phase_explain || '',
        elaborate: plan.phase_elaborate || '',
        evaluate: plan.phase_evaluate || ''
      },
      resources: resources,
      notes: plan.notes || ''
    }
  };
}

function getConcept(class_id, subject_id, topic_id) {
  const sheet = getSubjectSheet(class_id, subject_id, 'Concepts');
  if (!sheet) {
    return {
      ok: true,
      warnings: ["Concepts sheet not found in subject workbook for " + class_id + " " + subject_id],
      concept: null
    };
  }
  const rows = getRows(sheet);
  const concept = rows.find(r => r.topic_id === topic_id);
  if (!concept) {
    return { ok: true, concept: null };
  }

  const key_formulas = concept.key_formulas ? concept.key_formulas.split(';').map(s => s.trim()).filter(s => s.length > 0) : [];
  const misconceptions = concept.misconceptions ? concept.misconceptions.split(';').map(s => s.trim()).filter(s => s.length > 0) : [];

  return {
    ok: true,
    concept: {
      id: concept.concept_id,
      title: concept.concept_title,
      explanation: concept.explanation || '',
      key_formulas: key_formulas,
      misconceptions: misconceptions,
      visual_type: concept.visual_type || '',
      visual_data: concept.visual_data || '',
      notes: concept.notes || ''
    }
  };
}

// ── Write Actions ────────────────────────────────────────────────────────

function markPeriodDone(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    throw new Error('Could not obtain lock after 10 seconds.');
  }

  try {
    const timestamp = new Date().toISOString();
    const academic_year = getActiveAcademicYear();
    
    // 1. Append to period_completion_log
    const logSheet = getCentralSheet('period_completion_log');
    if (logSheet) {
      const log_id = 'LOG_' + Date.now();
      logSheet.appendRow([
        log_id, academic_year, payload.date, payload.slot_id, payload.class_id,
        payload.section_id, payload.subject_id, payload.teacher_id, payload.chapter_id,
        (payload.topic_ids_completed || []).join(','), payload.action_type, payload.notes || '', timestamp
      ]);
    }

    if (!payload.topic_ids_completed || payload.topic_ids_completed.length === 0) {
      return { ok: true };
    }

    // 2. Upsert topic_progress
    const tpSheet = getCentralSheet('topic_progress');
    if (tpSheet) {
      const dataRange = tpSheet.getDataRange();
      const values = dataRange.getValues();
      const headers = values[0];
      
      const academicYearIdx = headers.indexOf('academic_year');
      const classIdIdx = headers.indexOf('class_id');
      const sectionIdIdx = headers.indexOf('section_id');
      const subjectIdIdx = headers.indexOf('subject_id');
      const topicIdIdx = headers.indexOf('topic_id');
      const statusIdx = headers.indexOf('status');
      const completedByIdx = headers.indexOf('completed_by_teacher_id');
      const completedOnIdx = headers.indexOf('completed_on');
      const lastUpdatedIdx = headers.indexOf('last_updated');
      
      payload.topic_ids_completed.forEach(topic_id => {
        let foundRowIndex = -1;
        for (let i = 1; i < values.length; i++) {
          const row = values[i];
          if (row[academicYearIdx] === academic_year &&
              row[classIdIdx] === payload.class_id &&
              row[sectionIdIdx] === payload.section_id &&
              row[subjectIdIdx] === payload.subject_id &&
              row[topicIdIdx] === topic_id) {
            foundRowIndex = i + 1;
            break;
          }
        }
        
        if (foundRowIndex > -1) {
          if (statusIdx > -1) tpSheet.getRange(foundRowIndex, statusIdx + 1).setValue('completed');
          if (completedByIdx > -1) tpSheet.getRange(foundRowIndex, completedByIdx + 1).setValue(payload.teacher_id);
          if (completedOnIdx > -1) tpSheet.getRange(foundRowIndex, completedOnIdx + 1).setValue(payload.date);
          if (lastUpdatedIdx > -1) tpSheet.getRange(foundRowIndex, lastUpdatedIdx + 1).setValue(timestamp);
        } else {
          const progress_id = 'TP_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
          tpSheet.appendRow([
            progress_id, academic_year, payload.class_id, payload.section_id, payload.subject_id,
            payload.chapter_id, topic_id, 'completed', payload.teacher_id, payload.date, timestamp
          ]);
        }
      });
    }

    // 3 & 4. Update teaching_progress_summary & auto-advance
    const summarySheet = getCentralSheet('teaching_progress_summary');
    if (summarySheet && payload.action_type === 'mark_done') {
      let next_topic_id = null;
      let next_chapter_id = null;
      
      const subData = getCachedSubjectData(payload.class_id, payload.subject_id);
      const planRows = subData.topics.slice().sort((a, b) => Number(a.sequence_no) - Number(b.sequence_no));

      if (planRows.length > 0) {
        let highestSeq = -1;
        payload.topic_ids_completed.forEach(t_id => {
          const planItem = planRows.find(r => r.topic_id === t_id);
          if (planItem && Number(planItem.sequence_no) > highestSeq) {
            highestSeq = Number(planItem.sequence_no);
          }
        });
        
        const nextTopicItem = planRows.find(r => Number(r.sequence_no) > highestSeq);
        if (nextTopicItem) {
          next_topic_id = nextTopicItem.topic_id;
          next_chapter_id = nextTopicItem.chapter_id;
        } else {
           next_topic_id = payload.topic_ids_completed[payload.topic_ids_completed.length - 1];
           next_chapter_id = payload.chapter_id;
        }
      } else {
         next_topic_id = payload.topic_ids_completed[payload.topic_ids_completed.length - 1];
         next_chapter_id = payload.chapter_id;
      }

      const sData = summarySheet.getDataRange().getValues();
      const sHeaders = sData[0];
      const sAcadYearIdx = sHeaders.indexOf('academic_year');
      const sClassIdIdx = sHeaders.indexOf('class_id');
      const sSectionIdIdx = sHeaders.indexOf('section_id');
      const sSubjectIdIdx = sHeaders.indexOf('subject_id');
      
      const sCurrentChapIdx = sHeaders.indexOf('current_chapter_id');
      const sCurrentTopicIdx = sHeaders.indexOf('current_topic_id');
      const sTeacherIdx = sHeaders.indexOf('teacher_id');
      const sStatusIdx = sHeaders.indexOf('status');
      
      let foundSummaryIdx = -1;
      for (let i = 1; i < sData.length; i++) {
        const row = sData[i];
        if (row[sAcadYearIdx] === academic_year &&
            row[sClassIdIdx] === payload.class_id &&
            row[sSectionIdIdx] === payload.section_id &&
            row[sSubjectIdIdx] === payload.subject_id) {
          foundSummaryIdx = i + 1;
          break;
        }
      }
      
      if (foundSummaryIdx > -1) {
        if (sCurrentChapIdx > -1) summarySheet.getRange(foundSummaryIdx, sCurrentChapIdx + 1).setValue(next_chapter_id);
        if (sCurrentTopicIdx > -1) summarySheet.getRange(foundSummaryIdx, sCurrentTopicIdx + 1).setValue(next_topic_id);
        if (sTeacherIdx > -1) summarySheet.getRange(foundSummaryIdx, sTeacherIdx + 1).setValue(payload.teacher_id);
        if (sStatusIdx > -1) summarySheet.getRange(foundSummaryIdx, sStatusIdx + 1).setValue('in_progress');
      } else {
        const summary_id = 'TPS_' + Date.now();
        summarySheet.appendRow([
          summary_id, academic_year, payload.class_id, payload.section_id, payload.subject_id,
          next_chapter_id, next_topic_id, payload.teacher_id, 'in_progress', timestamp
        ]);
      }
    }
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}
