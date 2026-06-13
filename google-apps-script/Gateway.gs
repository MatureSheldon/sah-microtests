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
      // Using a mock check based on topic registry rather than hardcoding CLASS_8
      is_content_available: true // Mocked to true for all in this snippet, actual logic queries registry
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
  const slotsSheet = getCentralSheet('timetable_slots');
  const allSlots = getRows(slotsSheet);
  const slot = allSlots.find(s => s.slot_id === slot_id);
  if (!slot) throw new Error("Slot not found");

  const summarySheet = getCentralSheet('teaching_progress_summary');
  const summaries = getRows(summarySheet);
  const summary = summaries.find(s => s.class_id === slot.class_id && s.subject_id === slot.subject_id);
  
  const current_topic_id = summary ? summary.current_topic_id : 'T_01';
  const current_chapter_id = summary ? summary.current_chapter_id : 'CH_01';

  let planned_topics = [];
  const planSheet = getCentralSheet('teaching_plan');
  const planRows = getRows(planSheet).filter(r => r.class_id === slot.class_id && r.subject_id === slot.subject_id);

  if (planRows.length > 0) {
    planRows.sort((a, b) => Number(a.sequence_no) - Number(b.sequence_no));
    
    const tpSheet = getCentralSheet('topic_progress');
    const tpRows = getRows(tpSheet).filter(r => r.class_id === slot.class_id && r.subject_id === slot.subject_id && r.status === 'completed');
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
      planned_week: Math.ceil(Number(r.sequence_no || 1) / 3), // mock week
      sequence_no: Number(r.sequence_no),
      status_type: r.status_type
    }));
  } else {
    // Fallback if no teaching_plan
    planned_topics = [
      { topic_id: current_topic_id, topic_title: 'Topic ' + current_topic_id, planned_week: 1, sequence_no: 1, status_type: 'current' },
      { topic_id: current_topic_id + '_NEXT1', topic_title: 'Next Topic 1', planned_week: 1, sequence_no: 2, status_type: 'upcoming' },
      { topic_id: current_topic_id + '_NEXT2', topic_title: 'Next Topic 2', planned_week: 2, sequence_no: 3, status_type: 'upcoming' }
    ];
  }

  return {
    slot,
    progress: {
      current_chapter_id: current_chapter_id,
      current_topic_id: current_topic_id,
      current_chapter_title: 'Sample Chapter',
      current_topic_title: 'Sample Topic',
    },
    planned_topics: planned_topics,
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
  const lock = LockService.getScriptLock();
  try {
    // Wait up to 10 seconds for other processes to finish
    lock.waitLock(10000);
  } catch (e) {
    throw new Error('Could not obtain lock after 10 seconds.');
  }

  try {
    const timestamp = new Date().toISOString();
    const academic_year = '2026-27'; // Hardcoded for now
    
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
            foundRowIndex = i + 1; // 1-based index for sheet rows
            break;
          }
        }
        
        if (foundRowIndex > -1) {
          // Update existing row
          tpSheet.getRange(foundRowIndex, statusIdx + 1).setValue('completed');
          tpSheet.getRange(foundRowIndex, completedByIdx + 1).setValue(payload.teacher_id);
          tpSheet.getRange(foundRowIndex, completedOnIdx + 1).setValue(payload.date);
          if (lastUpdatedIdx > -1) tpSheet.getRange(foundRowIndex, lastUpdatedIdx + 1).setValue(timestamp);
        } else {
          // Append new row
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
      
      const planSheet = getCentralSheet('teaching_plan');
      if (planSheet) {
        const planRows = getRows(planSheet).filter(r => r.class_id === payload.class_id && r.subject_id === payload.subject_id);
        planRows.sort((a, b) => Number(a.sequence_no) - Number(b.sequence_no));
        
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
        summarySheet.getRange(foundSummaryIdx, sCurrentChapIdx + 1).setValue(next_chapter_id);
        summarySheet.getRange(foundSummaryIdx, sCurrentTopicIdx + 1).setValue(next_topic_id);
        summarySheet.getRange(foundSummaryIdx, sTeacherIdx + 1).setValue(payload.teacher_id);
        summarySheet.getRange(foundSummaryIdx, sStatusIdx + 1).setValue('in_progress');
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
