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
      case 'getChapterConcepts':
        result = getChapterConcepts(params.class_id, params.subject_id, params.chapter_id);
        break;
      case 'markPeriodDone':
        result = markPeriodDone(params);
        break;
      case 'saveRoadmapPlan':
        result = saveRoadmapPlan(params.class_id, params.subject_id, params.plan_data);
        break;
      case 'getTeacherClasses':
        result = getTeacherClasses(params.teacher_id);
        break;
      case 'getTeacherAssignments':
        result = getTeacherAssignments(params.teacher_id);
        break;
      case 'resolveTopicStruggle':
        result = resolveTopicStruggle(params.class_id, params.subject_id, params.topic_id);
        break;
      case 'getTeacherActionItems':
        result = getTeacherActionItems(params.teacher_id);
        break;
      case 'getTeachingLoad':
        result = getTeachingLoad(params.teacher_id);
        break;
      case 'getSubjectOutline':
        result = getSubjectOutline(params.class_id, params.subject_id);
        break;
      case 'getAllTeachers':
        result = getAllTeachers();
        break;
      case 'upsertTeacher':
        result = upsertTeacher(params.teacher);
        break;
      case 'deactivateTeacher':
        result = deactivateTeacher(params.teacher_id);
        break;
      case 'deleteTeacher':
        result = deleteTeacher(params.teacher_id);
        break;
      case 'getAllClasses':
        result = getAllClasses();
        break;
      case 'upsertClass':
        result = upsertClass(params.class_data);
        break;
      case 'getAllSections':
        result = getAllSections();
        break;
      case 'upsertSection':
        result = upsertSection(params.section_data);
        break;
      case 'getAllSubjects':
        result = getAllSubjects();
        break;
      case 'upsertSubject':
        result = upsertSubject(params.subject_data);
        break;
      case 'getAllAssignments':
        result = getAllAssignments();
        break;
      case 'upsertAssignment':
        result = upsertAssignment(params.assignment_data);
        break;
      case 'deactivateAssignment':
        result = deactivateAssignment(params.assignment_id);
        break;
      case 'getAdminOverview':
        result = getAdminOverview();
        break;
      case 'getAdminPacing':
        result = getAdminPacing();
        break;
      case 'getAdminActivity':
        result = getAdminActivity();
        break;
      case 'getCalendarEvents':
        result = getCalendarEvents(params.academic_year);
        break;
      case 'upsertCalendarEvent':
        result = upsertCalendarEvent(params.event_data);
        break;
      case 'deleteCalendarEvent':
        result = deleteCalendarEvent(params.event_id);
        break;
      case 'getSchoolDayStructure':
        result = getSchoolDayStructure();
        break;
      case 'saveSchoolDayStructure':
        result = saveSchoolDayStructure(params.structure);
        break;
      case 'getTimetableForSection':
        result = getTimetableForSection(params.class_id, params.section_id);
        break;
      case 'saveTimetableGrid':
        result = saveTimetableGrid(params.class_id, params.section_id, params.slots);
        break;
      case 'getAllTimetableSlots':
        result = getAllTimetableSlots();
        break;
      case 'cloneTimetable':
        result = cloneTimetable(params.source_class, params.source_section, params.target_class, params.target_section);
        break;
      case 'getWorkbookRegistry':
        result = getWorkbookRegistry();
        break;
      case 'linkWorkbook':
        result = linkWorkbook(params.registry_data);
        break;
      case 'testWorkbookConnection':
        result = testWorkbookConnection(params.class_id, params.subject_id);
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
  const ss = sheet.getParent();
  const tz = ss.getSpreadsheetTimeZone();
  for (let i = 1; i < data.length; i++) {
    const rowObj = {};
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) {
        let val = data[i][j];
        if (val instanceof Date) {
          if (val.getFullYear() === 1899) {
            val = Utilities.formatDate(val, tz, "hh:mm a");
          } else {
            val = Utilities.formatDate(val, tz, "yyyy-MM-dd");
          }
        }
        
        let headerKey = headers[j];
        if (headerKey === 'chapter id') headerKey = 'chapter_id';
        if (headerKey === 'topic id') headerKey = 'topic_id';
        if (headerKey === 'homework item id') headerKey = 'homework_item_id';
        if (headerKey === 'homework set id') headerKey = 'homework_set_id';
        
        rowObj[headerKey] = val;
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

function getTeacherAssignments(teacher_id) {
  const academic_year = getActiveAcademicYear();
  const sheet = getCentralSheet('section_subject_assignments');
  const rows = getRows(sheet);
  const seen = new Set();
  const assignments = [];
  rows
    .filter(r =>
      r.teacher_id === teacher_id &&
      String(r.status || '').trim().toLowerCase() === 'active' &&
      String(r.academic_year || '').trim() === academic_year
    )
    .forEach(r => {
      const key = r.class_id + '|' + r.subject_id;
      if (!seen.has(key)) {
        seen.add(key);
        assignments.push({
          class_id: r.class_id,
          class_label: r.class_id.replace('CLASS_', ''),
          subject_id: r.subject_id
        });
      }
    });
  assignments.sort((a, b) => Number(a.class_label) - Number(b.class_label) || a.subject_id.localeCompare(b.subject_id));
  return assignments;
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

function getTeacherActionItems(teacher_id) {
  const assignments = getTeacherAssignments(teacher_id);
  const actionItems = [];

  assignments.forEach(assignment => {
    const subData = getCachedSubjectData(assignment.class_id, assignment.subject_id);
    const activeTopics = subData.topics.filter(t => t.struggle_status === 'active');
    
    activeTopics.forEach(t => {
      let chapterTitle = '';
      if (t.chapter_id) {
        const curRow = subData.chapters.find(r => r.chapter_id === t.chapter_id);
        if (curRow) chapterTitle = curRow.chapter_title || '';
      }
      
      actionItems.push({
        class_id: assignment.class_id,
        class_label: assignment.class_label,
        subject_id: assignment.subject_id,
        chapter_id: t.chapter_id,
        chapter_title: chapterTitle,
        topic_id: t.topic_id,
        topic_title: t.topic_title
      });
    });
  });

  return actionItems;
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
        if (!chapterId && planRow.chapter_id) chapterId = planRow.chapter_id;
        if (!chapterTitle && planRow.chapter_id) {
          const curRow = curriculumRows.find(r => r.chapter_id === planRow.chapter_id);
          if (curRow) chapterTitle = curRow.chapter_title || '';
        }
      }
      
      // Fallback: If chapterId is still missing, find it directly from the topics list
      if (!chapterId) {
        const topRow = subData.topics.find(r => r.topic_id === topicId);
        if (topRow && topRow.chapter_id) chapterId = topRow.chapter_id;
      }
    }

    // Resolve resource existence
    const hasLessonPlan = subData.lessonPlans.some(r => r.topic_id === topicId);
    const hasConceptMap = subData.concepts.some(r => r.topic_id === topicId);
    const hasHomework = subData.homework.some(r => {
      const status = String(r.status || '').trim().toLowerCase();
      const isActive = status === '' || status === 'active' || status === 'ready';
      if (!isActive) return false;
      return chapterId && String(r.chapter_id || '').trim() === String(chapterId).trim();
    });

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

      let struggleStatus = '';
      if (topicId) {
        const planRow = planRows.find(r => r.topic_id === topicId);
        if (planRow) struggleStatus = planRow.struggle_status || '';
      }

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
        is_content_available: !!(chapterId && topicId),
        struggle_status: struggleStatus
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
  const topSheet = getSubjectSheet(class_id, subject_id, 'Topic_Map');
  let targetChapter = '';
  const topicTitleMap = {};
  const struggleMap = {};
  if (topSheet) {
    const topRows = getRows(topSheet);
    const topRow = topRows.find(r => String(r.topic_id || '').trim() === String(topic_id).trim());
    if (topRow) targetChapter = String(topRow.chapter_id || '').trim();
    topRows.forEach(r => {
       if (r.topic_id) {
         topicTitleMap[String(r.topic_id).trim()] = r.topic_title || String(r.topic_id).trim();
         struggleMap[String(r.topic_id).trim()] = String(r.struggle_status || '').trim();
       }
    });
  }

  const rows = getRows(sheet);
  const activeItems = rows
    .filter(r => {
      const rowChapter = String(r.chapter_id || '').trim();
      const status = String(r.status || '').trim().toLowerCase();
      const isActive = status === '' || status === 'active' || status === 'ready';
      return rowChapter === targetChapter && isActive;
    })
    .sort((a, b) => Number(a.sequence_no || 0) - Number(b.sequence_no || 0));

  if (activeItems.length === 0) {
    return { ok: true, set: null, items: [] };
  }

  const first = activeItems[0];
  const set_id = 'HW_SET_' + topic_id;
  const set_title = first.set_title || ('Practice: ' + topic_id);

  const items = activeItems.map(r => {
    const tId = String(r.topic_id || '').trim();
    return {
      homework_item_id: r.homework_item_id || r.homework_id,
      topic_id: tId,
      topic_title: topicTitleMap[tId] || tId,
      question_text: r.question_text,
      marks: Number(r.marks || 1),
      difficulty: r.difficulty || 'Medium',
      answer: r.answer || '',
      explanation: r.explanation || '',
      struggle_status: struggleMap[tId] || ''
    };
  });

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
  const academic_year = getActiveAcademicYear();
  const registrySheet = getCentralSheet('app_registry');
  let activeRegistry = getRows(registrySheet).filter(r => String(r.status||'').trim().toLowerCase() === 'active' && String(r.academic_year||'').trim() === academic_year);

  // Normalize parameters if provided
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

  // Filter registry if specific class/subject requested
  if (resolvedClassId) {
    activeRegistry = activeRegistry.filter(r => r.class_id === resolvedClassId);
  }
  if (resolvedSubjectId) {
    activeRegistry = activeRegistry.filter(r => r.subject_id === resolvedSubjectId);
  }

  let allQuestions = [];
  let allChapters = [];
  let warnings = [];

  if (activeRegistry.length === 0) {
    warnings.push("No active subject workbooks found in app_registry for the requested class/subject.");
  }

  activeRegistry.forEach(reg => {
    const qSheet = getSubjectSheet(reg.class_id, reg.subject_id, 'Questions');
    const chSheet = getSubjectSheet(reg.class_id, reg.subject_id, 'Chapter_Map');

    if (!qSheet) {
      warnings.push("Questions sheet not found for " + reg.class_id + " " + reg.subject_id);
    } else {
      allQuestions = allQuestions.concat(getRows(qSheet));
    }

    if (chSheet) {
      const chRows = getRows(chSheet).map(ch => ({
        classLevel: reg.class_id.replace('CLASS_', ''),
        subject: reg.subject_id,
        chapterNumber: Number(ch.chapter_no || 0),
        chapterName: ch.chapter_title || '',
        section: ''
      }));
      allChapters = allChapters.concat(chRows);
    }
  });

  return {
    ok: true,
    questions: allQuestions,
    chapters: allChapters,
    warnings: warnings.length > 0 ? warnings : undefined
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
      chapterTitle: plan.chapter_title || plan.topic_title || '',
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

function splitListField_(value) {
  const text = String(value || '').trim();
  if (!text) return [];

  // Prefer explicit line/list separators for prose-heavy fields. Semicolons
  // often appear inside complete explanatory sentences, so they are only a
  // fallback for older generated rows that used semicolon-separated lists.
  const lineParts = text
    .split(/\r?\n+/)
    .map(s => s.replace(/^\s*[-*•]\s*/, '').trim())
    .filter(s => s.length > 0);

  if (lineParts.length > 1) return lineParts;

  return text
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
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

  const key_formulas = splitListField_(concept.key_formulas);
  const misconceptions = splitListField_(concept.misconceptions);

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

function getChapterConcepts(class_id, subject_id, chapter_id) {
  const sheet = getSubjectSheet(class_id, subject_id, 'Concepts');
  if (!sheet) {
    return {
      ok: true,
      warnings: ["Concepts sheet not found in subject workbook for " + class_id + " " + subject_id],
      concepts: []
    };
  }
  const rows = getRows(sheet);
  // Match any topic_id that starts with the chapter_id
  const chapterConcepts = rows.filter(r => (r.topic_id || '').startsWith(chapter_id));

  const topSheet = getSubjectSheet(class_id, subject_id, 'Topic_Map');
  const struggleMap = {};
  if (topSheet) {
    const topRows = getRows(topSheet);
    topRows.forEach(r => {
       if (r.topic_id) {
         struggleMap[String(r.topic_id).trim()] = String(r.struggle_status || '').trim();
       }
    });
  }

  return {
    ok: true,
    concepts: chapterConcepts.map(concept => {
      const key_formulas = splitListField_(concept.key_formulas);
      const misconceptions = splitListField_(concept.misconceptions);
      const tId = String(concept.topic_id || '').trim();
      return {
        id: concept.concept_id,
        topic_id: tId,
        title: concept.concept_title,
        explanation: concept.explanation || '',
        visual_type: concept.visual_type || '',
        visual_data: concept.visual_data || '',
        key_formulas: key_formulas,
        misconceptions: misconceptions,
        notes: concept.notes || '',
        struggle_status: struggleMap[tId] || ''
      };
    })
  };
}

function saveRoadmapPlan(class_id, subject_id, plan_data) {
  // plan_data is expected to be an object mapping topic_id to planned_periods
  // e.g. { "SCI8_CH01_T01": 2.5, "SCI8_CH01_T02": 1.5 }
  const curSheet = getSubjectSheet(class_id, subject_id, 'Topic_Map');
  if (!curSheet) {
    return { ok: false, error: "Topic_Map sheet not found" };
  }

  const headers = curSheet.getRange(1, 1, 1, curSheet.getLastColumn()).getValues()[0];
  const ppColIndex = headers.findIndex(h => h.toString().toLowerCase().replace(/\s+/g, '_') === 'planned_periods') + 1;
  const tidColIndex = headers.findIndex(h => h.toString().toLowerCase().replace(/\s+/g, '_') === 'topic_id') + 1;

  if (ppColIndex === 0 || tidColIndex === 0) {
    return { ok: false, error: "Required columns missing in Topic_Map sheet" };
  }

  const data = curSheet.getDataRange().getValues();
  // Start from row 2
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const topicId = row[tidColIndex - 1];
    if (topicId && plan_data[topicId] !== undefined) {
      // Round to 1 decimal place max
      const newPeriods = Math.round(plan_data[topicId] * 10) / 10;
      // Write back to sheet (row i+1, column ppColIndex)
      curSheet.getRange(i + 1, ppColIndex).setValue(newPeriods);
    }
  }

  return { ok: true };
}

function getSubjectOutline(class_id, subject_id) {
  // Normalize class_id
  let resolvedClassId = class_id;
  if (resolvedClassId && resolvedClassId.indexOf('CLASS_') === -1) {
    resolvedClassId = 'CLASS_' + resolvedClassId;
  }
  let resolvedSubjectId = subject_id;
  if (resolvedSubjectId) {
    const sUpper = resolvedSubjectId.trim().toUpperCase();
    if (sUpper === 'MATHEMATICS' || sUpper === 'MATHS' || sUpper === 'MATH') resolvedSubjectId = 'MATH';
    else if (sUpper === 'SCIENCE' || sUpper === 'SCI') resolvedSubjectId = 'SCI';
    else if (sUpper === 'ENGLISH' || sUpper === 'ENG') resolvedSubjectId = 'ENG';
  }

  const data = getCachedSubjectData(resolvedClassId, resolvedSubjectId);
  const chapters = data.chapters;
  const topics = data.topics;
  const lessonPlans = data.lessonPlans;
  const concepts = data.concepts;
  const homework = data.homework;

  if (chapters.length === 0) {
    return {
      ok: true,
      class_id: resolvedClassId,
      subject_id: resolvedSubjectId,
      chapters: [],
      warnings: ['Chapter_Map sheet not found or empty for ' + resolvedClassId + ' ' + resolvedSubjectId]
    };
  }

  const lessonPlanTopicIds = new Set(lessonPlans.map(r => r.topic_id));
  const conceptTopicIds = new Set(concepts.map(r => r.topic_id));
  const homeworkTopicIds = new Set(homework.map(r => r.topic_id));

  // Group topics by chapter_id
  const topicsByChapter = {};
  topics.forEach(t => {
    const cid = t.chapter_id || '';
    if (!topicsByChapter[cid]) topicsByChapter[cid] = [];
    topicsByChapter[cid].push({
      topic_id: t.topic_id || '',
      topic_title: t.topic_title || '',
      sequence_no: Number(t.sequence_no || 0),
      planned_periods: Number(t.planned_periods || 1),
      has_lesson_plan: lessonPlanTopicIds.has(t.topic_id),
      has_concept: conceptTopicIds.has(t.topic_id),
      has_homework: homeworkTopicIds.has(t.topic_id),
      has_microtest: lessonPlanTopicIds.has(t.topic_id) || conceptTopicIds.has(t.topic_id),
      struggle_status: t.struggle_status || ''
    });
  });

  // Sort topics within each chapter
  Object.values(topicsByChapter).forEach(arr => arr.sort((a, b) => a.sequence_no - b.sequence_no));

  const outline = chapters
    .slice()
    .sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
    .map(ch => ({
      chapter_id: ch.chapter_id || '',
      chapter_no: Number(ch.chapter_no || 0),
      chapter_title: ch.chapter_title || '',
      total_periods: Number(ch.total_periods || 0),
      topics: topicsByChapter[ch.chapter_id] || []
    }));

  return {
    ok: true,
    class_id: resolvedClassId,
    subject_id: resolvedSubjectId,
    chapters: outline
  };
}


function getAllTeachers() {
  const sheet = getCentralSheet('teachers');
  return getRows(sheet);
}

function getAllClasses() {
  const sheet = getCentralSheet('classes');
  return getRows(sheet);
}

function getAllSections() {
  const sheet = getCentralSheet('sections');
  return getRows(sheet);
}

function getAllSubjects() {
  const sheet = getCentralSheet('subjects');
  return getRows(sheet);
}

function getAllAssignments() {
  const sheet = getCentralSheet('section_subject_assignments');
  return getRows(sheet);
}

function getAdminOverview() {
  const teachers = getAllTeachers().filter(t => String(t.status||'').toLowerCase() === 'active');
  const subjects = getAllSubjects().filter(s => String(s.status||'').toLowerCase() === 'active');
  
  const logSheet = getCentralSheet('period_completion_log');
  const logs = logSheet ? getRows(logSheet) : [];
  const thisWeekLogs = logs; // Simplified for now, real implementation would filter by date
  
  const attentionItems = [];
  
  return {
    ok: true,
    kpis: {
      active_teachers: teachers.length,
      active_subjects: subjects.length,
      periods_logged: thisWeekLogs.length,
      attention_count: attentionItems.length
    },
    attention_items: attentionItems
  };
}

function getAdminPacing() {
  const summarySheet = getCentralSheet('teaching_progress_summary');
  const summaries = summarySheet ? getRows(summarySheet) : [];
  return { ok: true, pacing: summaries };
}

function getAdminActivity() {
  const logSheet = getCentralSheet('period_completion_log');
  const logs = logSheet ? getRows(logSheet) : [];
  return { ok: true, activity: logs };
}

function getCalendarEvents(academic_year) {
  const sheet = getCentralSheet('academic_calendar');
  const events = sheet ? getRows(sheet) : [];
  const filtered = academic_year ? events.filter(e => String(e.academic_year||'').trim() === String(academic_year).trim()) : events;
  return { ok: true, events: filtered };
}

function getWorkbookRegistry() {
  const sheet = getCentralSheet('app_registry');
  return { ok: true, registry: sheet ? getRows(sheet) : [] };
}

function testWorkbookConnection(class_id, subject_id) {
  const ss = getSubjectWorkbook(class_id, subject_id);
  if (!ss) return { ok: false, error: 'Could not open workbook' };
  
  const sheets = ss.getSheets().map(s => s.getName());
  const required = ['Chapter_Map', 'Topic_Map', 'Lesson_Plans', 'Concepts', 'Resources', 'Homework'];
  const exists = required.filter(r => sheets.includes(r));
  
  return { 
    ok: true, 
    spreadsheet_id: ss.getId(), 
    spreadsheet_name: ss.getName(),
    sheets_found: exists.length,
    sheets_total: required.length,
    details: { exists, missing: required.filter(r => !sheets.includes(r)) }
  };
}

function getSchoolDayStructure() {
  try {
    const props = PropertiesService.getScriptProperties();
    const data = props.getProperty('SCHOOL_DAY_STRUCTURE');
    if (data) {
      return { ok: true, structure: JSON.parse(data) };
    }
  } catch (e) {
    Logger.log("Error reading structure: " + e.toString());
  }
  // Default if nothing saved yet
  return { ok: true, structure: [
    { period_no: 1, start_time: '08:30', end_time: '09:15', slot_type: 'instructional' },
    { period_no: 2, start_time: '09:15', end_time: '10:00', slot_type: 'instructional' },
    { period_no: 3, start_time: '10:00', end_time: '10:45', slot_type: 'instructional' },
    { period_no: 4, start_time: '10:45', end_time: '11:15', slot_type: 'break' },
    { period_no: 5, start_time: '11:15', end_time: '12:00', slot_type: 'instructional' },
    { period_no: 6, start_time: '12:00', end_time: '12:45', slot_type: 'instructional' },
    { period_no: 7, start_time: '12:45', end_time: '13:30', slot_type: 'instructional' }
  ]};
}

function getTimetableForSection(class_id, section_id) {
  const sheet = getCentralSheet('timetable_slots');
  const slots = sheet ? getRows(sheet) : [];
  const filtered = slots.filter(s => s.class_id === class_id && s.section_id === section_id);
  return { ok: true, slots: filtered };
}

// ── Write Actions ────────────────────────────────────────────────────────


function upsertRow(sheetName, primaryKey, keyValue, rowData, columnOrder) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    throw new Error('Could not obtain lock after 10 seconds.');
  }
  
  try {
    const sheet = getCentralSheet(sheetName);
    if (!sheet) throw new Error(sheetName + ' sheet not found');
    const data = sheet.getDataRange().getValues();
    if (data.length === 0) throw new Error(sheetName + ' sheet is empty');
    
    const headers = data[0].map(h => String(h).trim().toLowerCase().replace(/ /g, '_'));
    const keyIdx = headers.indexOf(primaryKey.toLowerCase().replace(/ /g, '_'));
    if (keyIdx === -1) throw new Error('Primary key column not found: ' + primaryKey);
    
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][keyIdx]).trim() === String(keyValue).trim()) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex > -1) {
      headers.forEach((h, idx) => {
        if (rowData[h] !== undefined) {
          sheet.getRange(rowIndex, idx + 1).setValue(rowData[h]);
        }
      });
    } else {
      const newRow = columnOrder.map(col => rowData[col.toLowerCase().replace(/ /g, '_')] || '');
      sheet.appendRow(newRow);
    }
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function hardDeleteRow(sheetName, primaryKey, keyValue) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) { throw new Error('Could not obtain lock after 10 seconds.'); }
  
  try {
    const sheet = getCentralSheet(sheetName);
    if (!sheet) throw new Error(sheetName + ' sheet not found');
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { ok: true };
    
    const headers = data[0].map(h => String(h).trim().toLowerCase().replace(/ /g, '_'));
    const keyIdx = headers.indexOf(primaryKey.toLowerCase().replace(/ /g, '_'));
    if (keyIdx === -1) throw new Error('Primary key column not found');
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][keyIdx]).trim() === String(keyValue).trim()) {
        sheet.deleteRow(i + 1);
        return { ok: true };
      }
    }
    return { ok: true }; // Not found, effectively deleted
  } finally {
    lock.releaseLock();
  }
}

function upsertTeacher(teacher) {
  if (!teacher.teacher_id) {
    const sheet = getCentralSheet('teachers');
    const data = sheet.getDataRange().getValues();
    let maxSequence = 0;
    for (let i = 1; i < data.length; i++) {
      const idStr = String(data[i][0] || ''); // assuming column 0 is teacher_id
      if (idStr.startsWith('T')) {
        // e.g. T26-AB-01 -> split by '-'
        const parts = idStr.split('-');
        if (parts.length === 3) {
          const num = parseInt(parts[2], 10);
          if (!isNaN(num) && num > maxSequence) {
            maxSequence = num;
          }
        } else {
          // Fallback for old T001 formats, ignore large timestamps (e.g. 1784544977940)
          const num = parseInt(idStr.substring(1), 10);
          if (!isNaN(num) && num < 100000 && num > maxSequence) {
            maxSequence = num;
          }
        }
      }
    }
    const year = new Date().getFullYear().toString().slice(-2);
    const shortName = (teacher.short_name || 'X').toUpperCase().replace(/[^A-Z]/g, '').substring(0, 3);
    const sequence = String(maxSequence + 1).padStart(2, '0');
    teacher.teacher_id = `T${year}-${shortName}-${sequence}`;
  }
  if (!teacher.status) teacher.status = 'active';
  const columns = ['teacher_id', 'teacher_name', 'short_name', 'email', 'phone', 'status', 'capable_subjects', 'capable_classes'];
  upsertRow('teachers', 'teacher_id', teacher.teacher_id, teacher, columns);
  return { ok: true, teacher_id: teacher.teacher_id };
}

function deactivateTeacher(teacher_id) {
  upsertRow('teachers', 'teacher_id', teacher_id, { status: 'inactive' }, []);
  return { ok: true };
}

function deleteTeacher(teacher_id) {
  return hardDeleteRow('teachers', 'teacher_id', teacher_id);
}

function upsertClass(class_data) {
  if (!class_data.class_id) class_data.class_id = 'CLASS_' + Date.now();
  if (!class_data.status) class_data.status = 'active';
  const columns = ['class_id', 'class_label', 'status'];
  upsertRow('classes', 'class_id', class_data.class_id, class_data, columns);
  return { ok: true, class_id: class_data.class_id };
}

function upsertSection(section_data) {
  if (!section_data.section_id) return { ok: false, error: 'section_id required' };
  if (!section_data.status) section_data.status = 'active';
  const columns = ['section_id', 'class_id', 'section_label', 'status'];
  // Primary key for section is tricky (class_id + section_id). Let's assume section_id is unique per row for now.
  upsertRow('sections', 'section_id', section_data.section_id, section_data, columns);
  return { ok: true };
}

function upsertSubject(subject_data) {
  if (!subject_data.subject_id) subject_data.subject_id = 'SUB_' + Date.now();
  if (!subject_data.status) subject_data.status = 'active';
  const columns = ['subject_id', 'subject_name', 'subject_code', 'status'];
  upsertRow('subjects', 'subject_id', subject_data.subject_id, subject_data, columns);
  return { ok: true, subject_id: subject_data.subject_id };
}

function upsertAssignment(assignment_data) {
  if (!assignment_data.assignment_id) assignment_data.assignment_id = 'ASSIGN_' + Date.now();
  if (!assignment_data.status) assignment_data.status = 'active';
  if (!assignment_data.academic_year) assignment_data.academic_year = getActiveAcademicYear();
  if (!assignment_data.role) assignment_data.role = 'primary';
  const columns = ['assignment_id', 'academic_year', 'class_id', 'section_id', 'subject_id', 'teacher_id', 'role', 'effective_from', 'effective_to', 'status'];
  upsertRow('section_subject_assignments', 'assignment_id', assignment_data.assignment_id, assignment_data, columns);
  return { ok: true, assignment_id: assignment_data.assignment_id };
}

function deactivateAssignment(assignment_id) {
  upsertRow('section_subject_assignments', 'assignment_id', assignment_id, { status: 'inactive' }, []);
  return { ok: true };
}

function upsertCalendarEvent(event_data) {
  if (!event_data.event_id) event_data.event_id = 'EVT_' + Date.now();
  if (!event_data.status) event_data.status = 'active';
  if (!event_data.academic_year) event_data.academic_year = getActiveAcademicYear();
  const columns = ['event_id', 'academic_year', 'event_type', 'event_name', 'start_date', 'end_date', 'scope', 'class_ids', 'section_ids', 'affected_periods', 'is_working_day', 'is_instructional_day', 'notes', 'status'];
  upsertRow('academic_calendar', 'event_id', event_data.event_id, event_data, columns);
  return { ok: true, event_id: event_data.event_id };
}

function deleteCalendarEvent(event_id) {
  upsertRow('academic_calendar', 'event_id', event_id, { status: 'inactive' }, []);
  return { ok: true };
}

function saveSchoolDayStructure(structure) {
  try {
    const props = PropertiesService.getScriptProperties();
    props.setProperty('SCHOOL_DAY_STRUCTURE', JSON.stringify(structure));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.toString() };
  }
}

function saveTimetableGrid(class_id, section_id, slots) {
  // In a real implementation this would bulk overwrite.
  // We will loop and upsert each slot.
  const columns = ['slot_id', 'academic_year', 'day', 'period_no', 'start_time', 'end_time', 'slot_type', 'class_id', 'section_id', 'subject_id', 'assignment_id', 'teacher_id', 'room_id', 'effective_from', 'effective_to', 'status'];
  const academic_year = getActiveAcademicYear();
  
  slots.forEach(slot => {
    if (!slot.slot_id) slot.slot_id = 'TT_' + Date.now() + Math.floor(Math.random() * 1000);
    slot.academic_year = academic_year;
    slot.class_id = class_id;
    slot.section_id = section_id;
    slot.status = 'active';
    upsertRow('timetable_slots', 'slot_id', slot.slot_id, slot, columns);
  });
  
  return { ok: true };
}

function cloneTimetable(source_class, source_section, target_class, target_section) {
  const sheet = getCentralSheet('timetable_slots');
  const slots = sheet ? getRows(sheet) : [];
  const sourceSlots = slots.filter(s => s.class_id === source_class && s.section_id === source_section && String(s.status||'').toLowerCase() === 'active');
  
  const columns = ['slot_id', 'academic_year', 'day', 'period_no', 'start_time', 'end_time', 'slot_type', 'class_id', 'section_id', 'subject_id', 'assignment_id', 'teacher_id', 'room_id', 'effective_from', 'effective_to', 'status'];
  const academic_year = getActiveAcademicYear();
  
  sourceSlots.forEach(s => {
    const newSlot = { ...s, slot_id: 'TT_' + Date.now() + Math.floor(Math.random() * 1000), class_id: target_class, section_id: target_section, status: 'active' };
    upsertRow('timetable_slots', 'slot_id', newSlot.slot_id, newSlot, columns);
  });
  
  return { ok: true };
}

function linkWorkbook(registry_data) {
  if (!registry_data.registry_id) registry_data.registry_id = 'REG_' + Date.now();
  if (!registry_data.status) registry_data.status = 'active';
  if (!registry_data.academic_year) registry_data.academic_year = getActiveAcademicYear();
  
  const columns = ['registry_id', 'academic_year', 'class_id', 'subject_id', 'spreadsheet_id', 'status', 'last_synced'];
  // For registry, we should probably check by class_id and subject_id, but we'll assume registry_id works for updates.
  upsertRow('app_registry', 'registry_id', registry_data.registry_id, registry_data, columns);
  return { ok: true, registry_id: registry_data.registry_id };
}

function resolveTopicStruggle(class_id, subject_id, topic_id) {
  const topSheet = getSubjectSheet(class_id, subject_id, 'Topic_Map');
  if (!topSheet) throw new Error('Topic_Map sheet not found');
  
  const topDataRange = topSheet.getDataRange();
  const topValues = topDataRange.getValues();
  const topHeaders = topValues[0].map(h => String(h || '').trim().toLowerCase().replace(/ /g, '_'));
  
  const topicIdIdxTop = topHeaders.indexOf('topic_id');
  const struggleIdx = topHeaders.indexOf('struggle_status');
  
  if (topicIdIdxTop === -1 || struggleIdx === -1) {
    throw new Error('Required columns missing in Topic_Map');
  }

  let rowIndex = -1;
  for (let i = 1; i < topValues.length; i++) {
    if (topValues[i][topicIdIdxTop] === topic_id) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex > -1) {
    topSheet.getRange(rowIndex, struggleIdx + 1).setValue('resolved');
    return { ok: true, topic_id, status: 'resolved' };
  }
  
  throw new Error('Topic not found');
}

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
        (payload.topic_ids_completed || []).join(','), payload.action_type, payload.notes || '', timestamp, payload.student_understanding || ''
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

    // 2.5 Update Topic_Map with struggle_status if rated
    if (payload.student_understanding === 'Struggled') {
      const topSheet = getSubjectSheet(payload.class_id, payload.subject_id, 'Topic_Map');
      if (topSheet) {
        const topDataRange = topSheet.getDataRange();
        const topValues = topDataRange.getValues();
        const topHeaders = topValues[0].map(h => String(h || '').trim().toLowerCase().replace(/ /g, '_'));
        const topicIdIdxTop = topHeaders.indexOf('topic_id');
        const struggleIdx = topHeaders.indexOf('struggle_status');
        const histDiffIdx = topHeaders.indexOf('historical_difficulty');

        if (topicIdIdxTop > -1) {
          payload.topic_ids_completed.forEach(topic_id => {
            let rowIndex = -1;
            for (let i = 1; i < topValues.length; i++) {
              if (topValues[i][topicIdIdxTop] === topic_id) {
                rowIndex = i + 1;
                break;
              }
            }
            if (rowIndex > -1) {
              if (struggleIdx > -1) topSheet.getRange(rowIndex, struggleIdx + 1).setValue('active');
              if (histDiffIdx > -1) {
                const cur = topValues[rowIndex - 1][histDiffIdx] || '';
                topSheet.getRange(rowIndex, histDiffIdx + 1).setValue(cur ? cur + '|Struggled' : 'Struggled');
              }
            }
          });
        }
      }
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

// ── Timetable Auto-Generation ─────────────────────────────────────────────

function getAllTimetableSlots() {
  const sheet = getCentralSheet('timetable_slots');
  if (!sheet) return { slots: [] };
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { slots: [] };
  const headers = data[0].map(h => String(h).trim().toLowerCase().replace(/ /g, '_'));
  
  const slots = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = row[idx]; });
    slots.push(obj);
  }
  return { slots };
}

function generateTimetable(payload) {
  const { class_id, section_id, frequencies } = payload;
  
  // 1. Get School Day Structure
  const structResponse = getSchoolDayStructure();
  const periods = structResponse.structure
    .filter(s => s.slot_type === 'instructional')
    .map(s => ({
      period_no: s.period_no,
      start_time: s.start_time,
      end_time: s.end_time
    }));

  // 2. Get Assignments for this section to map subjects to teachers
  const assignments = getAllAssignments().assignments.filter(a => 
    a.class_id === class_id && a.section_id === section_id && a.status === 'active'
  );
  const subjectToTeacher = {};
  assignments.forEach(a => {
    subjectToTeacher[a.subject_id] = a.teacher_id;
  });

  // 3. Get all school timetable slots to map busy teachers
  const allSlots = getAllTimetableSlots().slots.filter(s => s.status === 'active');
  const teacherBusyMap = {}; // 'T001-Monday-1' -> true
  allSlots.forEach(s => {
    // If it's a different section, log the teacher as busy
    if (s.class_id !== class_id || s.section_id !== section_id) {
      if (s.subject_id) {
        // We need to look up who teaches that subject in that section
        const a = getAllAssignments().assignments.find(x => 
          x.class_id === s.class_id && x.section_id === s.section_id && x.subject_id === s.subject_id && x.status === 'active'
        );
        if (a) {
          teacherBusyMap[`${a.teacher_id}-${s.day}-${s.period_no}`] = true;
        }
      }
    }
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const proposedSlots = [];
  const subjectDayMap = {}; // 'MATH-Monday' -> true to avoid same subject twice in a day

  // Sort subjects by frequency (highest first), then by core priority
  const subjectsToSchedule = Object.keys(frequencies).map(sub => ({
    subject_id: sub,
    count: parseInt(frequencies[sub], 10),
    isCore: ['MATH', 'SCI', 'ENG'].includes(sub)
  })).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (a.isCore && !b.isCore) return -1;
    if (!a.isCore && b.isCore) return 1;
    return 0;
  });

  // Helper to check if a slot is valid
  const isValidSlot = (day, period_no, subject_id, teacher_id, isCore) => {
    // Check if slot already filled in proposed
    if (proposedSlots.some(s => s.day === day && s.period_no === period_no)) return false;
    // Check spread rule
    if (subjectDayMap[`${subject_id}-${day}`]) return false;
    // Check teacher availability
    if (teacherBusyMap[`${teacher_id}-${day}-${period_no}`]) return false;
    return true;
  };

  // Schedule
  subjectsToSchedule.forEach(item => {
    let countRemaining = item.count;
    const teacher_id = subjectToTeacher[item.subject_id];
    
    // Fallback if no teacher assigned
    if (!teacher_id) {
      // Continue, but it will be a problem
    }

    // Try to place
    for (let c = 0; c < countRemaining; c++) {
      let placed = false;
      
      // Heuristic: Math/Sci prefers period 1 or 2
      const preferredPeriods = item.isCore ? [1, 2, 3, 4, 5, 6, 7] : [4, 5, 6, 7, 3, 2, 1];
      
      for (const period of preferredPeriods) {
        if (placed) break;
        // Search across days
        for (const day of days) {
          if (isValidSlot(day, period, item.subject_id, teacher_id, item.isCore)) {
            const periodStruct = periods.find(p => p.period_no === period);
            if (periodStruct) {
              proposedSlots.push({
                slot_id: 'TT_AUTO_' + Date.now() + Math.floor(Math.random()*1000),
                academic_year: '2026-27',
                class_id,
                section_id,
                day,
                period_no: period,
                start_time: periodStruct.start_time,
                end_time: periodStruct.end_time,
                subject_id: item.subject_id,
                status: 'active'
              });
              subjectDayMap[`${item.subject_id}-${day}`] = true;
              teacherBusyMap[`${teacher_id}-${day}-${period}`] = true;
              placed = true;
              break;
            }
          }
        }
      }
      
      if (!placed) {
        // If we couldn't place it adhering to spread rule, we can try breaking the spread rule (e.g. block period)
        // For simplicity, we just leave it unplaced and let Admin deal with it manually.
      }
    }
  });

  return { ok: true, proposed_slots: proposedSlots };
}
