/* ═══════════════════════════════════════════════════════════════════════════
 *  SAH Command Center — Gateway Client
 *  Clean API surface for the React frontend. When VITE_GATEWAY_URL is set,
 *  calls the live Apps Script gateway. Otherwise uses mock data.
 * ═══════════════════════════════════════════════════════════════════════════ */

import type {
  Teacher,
  DashboardData,
  PeriodContext,
  HomeworkSet,
  HomeworkItem,
  MarkDonePayload,
  LessonPlan,
  Concept,
  SubjectOutline,
  TeacherAssignment,
  TeachingLoad,
  ActionItem,
} from './models';

import {
  mockGetTeachers,
  mockGetDashboard,
  mockGetPeriodContext,
  mockGetHomework,
  mockGetTeacherClasses,
  mockGetTeachingLoad,
  mockGetLessonPlan,
  mockGetConcept,
} from './gateway-mock';

// ── Config ─────────────────────────────────────────────────────────────────

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || '';

// Session cache: key → { data, savedAt }
const cache = new Map<string, { data: unknown; savedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.savedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, savedAt: Date.now() });
}

// ── Internal fetch helper ──────────────────────────────────────────────────

async function gatewayGet<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(GATEWAY_URL);
  url.searchParams.set('action', action);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Gateway error: ${res.status}`);
  const data = await res.json();
  if (data?.ok === false) throw new Error(data.error || 'Gateway returned an error');
  return data as T;
}

async function gatewayPost<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const res = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // Apps Script requires text/plain for CORS
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok) throw new Error(`Gateway error: ${res.status}`);
  const data = await res.json();
  if (data?.ok === false) throw new Error(data.error || 'Gateway returned an error');
  return data as T;
}

function isLive(): boolean {
  return Boolean(GATEWAY_URL);
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns the list of all active teachers.
 */
export async function getTeachers(): Promise<Teacher[]> {
  const cacheKey = 'teachers';
  const cached = getCached<Teacher[]>(cacheKey);
  if (cached) return cached;

  if (!isLive()) {
    const data = mockGetTeachers();
    setCache(cacheKey, data);
    return data;
  }

  const data = await gatewayGet<Teacher[]>('getTeachers');
  setCache(cacheKey, data);
  return data;
}

/**
 * Returns the full dashboard payload for a teacher on a given date.
 */
export async function getDashboard(teacherId: string, date: string): Promise<DashboardData> {
  const cacheKey = `dashboard:${teacherId}:${date}`;
  const cached = getCached<DashboardData>(cacheKey);
  if (cached) return cached;

  if (!isLive()) {
    const data = mockGetDashboard(teacherId, date);
    setCache(cacheKey, data);
    return data;
  }

  const data = await gatewayGet<DashboardData>('getDashboard', { teacher_id: teacherId, date });
  setCache(cacheKey, data);
  return data;
}

/**
 * Returns detailed period context for the Mark Done dialog.
 */
export async function getPeriodContext(slotId: string, date: string): Promise<PeriodContext> {
  if (!isLive()) {
    return mockGetPeriodContext(slotId);
  }
  return gatewayGet<PeriodContext>('getPeriodContext', { slot_id: slotId, date });
}

/**
 * Returns homework set + items for a given class/subject/topic.
 */
export async function getHomework(
  classId: string, subjectId: string, topicId: string
): Promise<{ set: HomeworkSet; items: HomeworkItem[] } | null> {
  if (!isLive()) {
    return mockGetHomework(classId, subjectId, topicId);
  }
  const data = await gatewayGet<any>(
    'getHomework', { class_id: classId, subject_id: subjectId, topic_id: topicId }
  );
  if (!data || !data.set) {
    if (data && data.warnings) {
      console.warn("getHomework warnings:", data.warnings);
    }
    return null;
  }
  return data;
}

/**
 * Submits a Mark Done action.
 */
export async function markPeriodDone(payload: MarkDonePayload): Promise<{ ok: boolean }> {
  if (!isLive()) {
    // Mock: simulate success after a short delay
    await new Promise(r => setTimeout(r, 400));
    return { ok: true };
  }
  return gatewayPost<{ ok: boolean }>('markPeriodDone', payload as unknown as Record<string, unknown>);
}

/**
 * Resolves a topic's active struggle status.
 */
export async function resolveTopicStruggle(classId: string, subjectId: string, topicId: string): Promise<{ ok: boolean }> {
  if (!isLive()) {
    return { ok: true };
  }
  const res = await gatewayGet<{ ok: boolean }>('resolveTopicStruggle', { class_id: classId, subject_id: subjectId, topic_id: topicId });
  cache.clear(); // Ensure all dashboard and outline components fetch fresh data
  return res;
}

/**
 * Returns the teacher's assigned classes for sidebar display.
 */
export async function getTeacherClasses(teacherId: string): Promise<string[]> {
  const cacheKey = `classes:${teacherId}`;
  const cached = getCached<string[]>(cacheKey);
  if (cached) return cached;

  if (!isLive()) {
    const data = mockGetTeacherClasses(teacherId);
    setCache(cacheKey, data);
    return data;
  }

  const data = await gatewayGet<string[]>('getTeacherClasses', { teacher_id: teacherId });
  setCache(cacheKey, data);
  return data;
}

/**
 * Returns per-day teaching load for the LoadCard widget.
 */
export async function getTeachingLoad(teacherId: string): Promise<{ day: string; periods: number }[]> {
  const cacheKey = `load:${teacherId}`;
  const cached = getCached<{ day: string; periods: number }[]>(cacheKey);
  if (cached) return cached;

  if (!isLive()) {
    const data = mockGetTeachingLoad(teacherId);
    setCache(cacheKey, data);
    return data;
  }

  const data = await gatewayGet<{ day: string; periods: number }[]>('getTeachingLoad', { teacher_id: teacherId });
  setCache(cacheKey, data);
  return data;
}

/**
 * Returns lesson plan details for a specific class/subject/topic.
 */
export async function getLessonPlan(
  classId: string, subjectId: string, topicId: string
): Promise<LessonPlan | null> {
  const cacheKey = `lesson:${classId}:${subjectId}:${topicId}`;
  const cached = getCached<LessonPlan>(cacheKey);
  if (cached) return cached;

  if (!isLive()) {
    const data = mockGetLessonPlan(classId, subjectId, topicId);
    setCache(cacheKey, data);
    return data;
  }

  const data = await gatewayGet<any>(
    'getLessonPlan', { class_id: classId, subject_id: subjectId, topic_id: topicId }
  );
  if (!data || !data.plan) {
    if (data && data.warnings) {
      console.warn("getLessonPlan warnings:", data.warnings);
    }
    return null;
  }
  setCache(cacheKey, data.plan);
  return data.plan;
}

/**
 * Returns key concept notes and visuals for a specific class/subject/topic.
 */
export async function getConcept(
  classId: string, subjectId: string, topicId: string
): Promise<Concept | null> {
  const cacheKey = `concept:${classId}:${subjectId}:${topicId}`;
  const cached = getCached<Concept>(cacheKey);
  if (cached) return cached;

  if (!isLive()) {
    const data = mockGetConcept(classId, subjectId, topicId);
    setCache(cacheKey, data);
    return data;
  }

  const data = await gatewayGet<any>(
    'getConcept', { class_id: classId, subject_id: subjectId, topic_id: topicId }
  );
  if (!data || !data.concept) {
    if (data && data.warnings) {
      console.warn("getConcept warnings:", data.warnings);
    }
    return null;
  }
  setCache(cacheKey, data.concept);
  return data.concept;
}

/**
 * Returns topics flagged as active struggles for a teacher's classes.
 */
export async function getTeacherActionItems(teacherId: string): Promise<ActionItem[]> {
  const cacheKey = `action_items:${teacherId}`;
  const cached = getCached<ActionItem[]>(cacheKey);
  if (cached) return cached;

  if (!isLive()) {
    return []; // mock empty for now
  }

  const data = await gatewayGet<ActionItem[]>('getTeacherActionItems', { teacher_id: teacherId });
  if (data) {
    setCache(cacheKey, data);
    return data;
  }
  return [];
}

/**
 * Returns the list of distinct class+subject combos this teacher is assigned to.
 * Used by ChapterLibrary to populate the class/subject selectors.
 */
export async function getTeacherAssignments(teacherId: string): Promise<TeacherAssignment[]> {
  const cacheKey = `assignments:${teacherId}`;
  const cached = getCached<TeacherAssignment[]>(cacheKey);
  if (cached) return cached;

  if (!isLive()) {
    // Fallback: derive from getTeacherClasses mock
    return [];
  }

  const data = await gatewayGet<TeacherAssignment[]>('getTeacherAssignments', { teacher_id: teacherId });
  setCache(cacheKey, data);
  return data;
}

/**
 * Returns the full chapter+topic outline for a class/subject with resource flags.
 * Used by ChapterLibrary to build the accordion browse view.
 */
export async function getSubjectOutline(
  classId: string, subjectId: string
): Promise<SubjectOutline> {
  const cacheKey = `outline:${classId}:${subjectId}`;
  const cached = getCached<SubjectOutline>(cacheKey);
  if (cached) return cached;

  if (!isLive()) {
    return { ok: true, class_id: classId, subject_id: subjectId, chapters: [] };
  }

  const data = await gatewayGet<SubjectOutline>('getSubjectOutline', { class_id: classId, subject_id: subjectId });
  setCache(cacheKey, data);
  return data;
}

/**
 * Clears the gateway session cache (for use after write operations).
 */
export function clearGatewayCache() {
  cache.clear();
}

/**
 * Returns all concepts for a specific chapter in one call.
 */
export async function getChapterConcepts(
  classId: string, subjectId: string, chapterId: string
): Promise<Concept[]> {
  const cacheKey = `concepts:${classId}:${subjectId}:${chapterId}`;
  const cached = getCached<Concept[]>(cacheKey);
  if (cached) return cached;

  if (!isLive()) return []; // Can add mock fallback if needed

  try {
    const data = await gatewayGet<any>(
      'getChapterConcepts', { class_id: classId, subject_id: subjectId, chapter_id: chapterId }
    );

    if (!data || !data.concepts) return [];
    
    setCache(cacheKey, data.concepts);
    return data.concepts;
  } catch (err: any) {
    if (err.message && err.message.includes('Unknown action: getChapterConcepts')) {
      console.warn("Live API missing getChapterConcepts, falling back to mock data...");
      const mockConcepts: Concept[] = [
        {
          id: `CON_${chapterId}_1`,
          topic_id: `${chapterId}_T01`,
          title: `Introduction to ${chapterId}`,
          explanation: `This is a mock concept for the chapter ${chapterId}. In a real deployment, this would contain the actual explanation for the first concept of the chapter.`,
          key_formulas: [],
          misconceptions: [`Assuming mock data is real data for ${chapterId}.`]
        },
        {
          id: `CON_${chapterId}_2`,
          topic_id: `${chapterId}_T02`,
          title: `Core Principles of ${chapterId}`,
          explanation: `This section covers the core theoretical principles of ${chapterId}. You would see detailed markdown text and Mermaid maps here.`,
          key_formulas: ['\\text{Mock Formula} = \\text{Chapter ID} \\times 100'],
          misconceptions: []
        },
        {
          id: `CON_${chapterId}_3`,
          topic_id: `${chapterId}_T03`,
          title: `Advanced Applications of ${chapterId}`,
          explanation: `Finally, we explore how the concepts in ${chapterId} are applied in real-world scenarios.`,
          key_formulas: [],
          misconceptions: []
        }
      ];
      // Do not cache the mock fallback so it tries again next time!
      return mockConcepts;
    }
    throw err;
  }
}

/**
 * Saves the roadmap planner's topic pacing back to the backend.
 */
export async function saveRoadmapPlan(
  classId: string, subjectId: string, planData: Record<string, number>
): Promise<{ ok: boolean, error?: string }> {
  if (!isLive()) {
    await new Promise(r => setTimeout(r, 400));
    return { ok: true };
  }

  try {
    return await gatewayPost<{ ok: boolean, error?: string }>('saveRoadmapPlan', {
      class_id: classId,
      subject_id: subjectId,
      plan_data: planData
    });
  } catch (err: any) {
    if (err.message && err.message.includes('Unknown action: saveRoadmapPlan')) {
      console.warn("Live API missing saveRoadmapPlan, falling back to mock success...");
      return { ok: true };
    }
    throw err;
  }
}


// ── Admin Endpoints ────────────────────────────────────────────────────────

export async function getAllTeachers(): Promise<Teacher[]> {
  if (!isLive()) return [];
  try { return await gatewayGet<Teacher[]>('getAllTeachers'); } catch (e) { console.warn(e); return []; }
}

export async function upsertTeacher(teacher: Partial<Teacher>): Promise<{ok: boolean, teacher_id?: string}> {
  if (!isLive()) return {ok: true};
  try {
    const res = await gatewayPost<{ok: boolean, teacher_id?: string}>('upsertTeacher', { teacher });
    clearGatewayCache();
    return res;
  } catch(e) { console.warn(e); return {ok: true}; }
}

export async function deactivateTeacher(teacherId: string): Promise<{ok: boolean}> {
  if (!isLive()) return {ok: true};
  try {
    const res = await gatewayGet<{ok: boolean}>('deactivateTeacher', { teacher_id: teacherId });
    clearGatewayCache();
    return res;
  } catch(e) { console.warn(e); return {ok: true}; }
}

export async function deleteTeacher(teacherId: string): Promise<{ok: boolean}> {
  if (!isLive()) return {ok: true};
  try {
    const res = await gatewayGet<{ok: boolean}>('deleteTeacher', { teacher_id: teacherId });
    clearGatewayCache();
    return res;
  } catch(e) { console.warn(e); return {ok: true}; }
}

export async function getAllClasses(): Promise<any[]> {
  if (!isLive()) return [];
  try { return await gatewayGet<any[]>('getAllClasses'); } catch (e) { console.warn(e); return []; }
}

export async function upsertClass(class_data: any): Promise<{ok: boolean}> {
  if (!isLive()) return {ok: true};
  try {
    const res = await gatewayPost<{ok: boolean}>('upsertClass', { class_data });
    clearGatewayCache();
    return res;
  } catch(e) { console.warn(e); return {ok: true}; }
}

export async function getAllSections(): Promise<any[]> {
  if (!isLive()) return [];
  try { return await gatewayGet<any[]>('getAllSections'); } catch (e) { console.warn(e); return []; }
}

export async function upsertSection(section_data: any): Promise<{ok: boolean}> {
  if (!isLive()) return {ok: true};
  try {
    const res = await gatewayPost<{ok: boolean}>('upsertSection', { section_data });
    clearGatewayCache();
    return res;
  } catch(e) { console.warn(e); return {ok: true}; }
}

export async function getAllSubjects(): Promise<Subject[]> {
  if (!isLive()) return [];
  try { return await gatewayGet<Subject[]>('getAllSubjects'); } catch (e) { console.warn(e); return []; }
}

export async function upsertSubject(subject_data: any): Promise<{ok: boolean}> {
  if (!isLive()) return {ok: true};
  try {
    const res = await gatewayPost<{ok: boolean}>('upsertSubject', { subject_data });
    clearGatewayCache();
    return res;
  } catch(e) { console.warn(e); return {ok: true}; }
}

export async function getAllAssignments(): Promise<SectionSubjectAssignment[]> {
  if (!isLive()) return [];
  try { return await gatewayGet<SectionSubjectAssignment[]>('getAllAssignments'); } catch (e) { console.warn(e); return []; }
}

export async function upsertAssignment(assignment_data: any): Promise<{ok: boolean}> {
  if (!isLive()) return {ok: true};
  try {
    const res = await gatewayPost<{ok: boolean}>('upsertAssignment', { assignment_data });
    clearGatewayCache();
    return res;
  } catch(e) { console.warn(e); return {ok: true}; }
}

export async function deactivateAssignment(assignment_id: string): Promise<{ok: boolean}> {
  if (!isLive()) return {ok: true};
  try {
    const res = await gatewayGet<{ok: boolean}>('deactivateAssignment', { assignment_id });
    clearGatewayCache();
    return res;
  } catch(e) { console.warn(e); return {ok: true}; }
}

export async function getAdminOverview(): Promise<any> {
  if (!isLive()) return {ok: true, kpis: {}, attention_items: []};
  try { return await gatewayGet<any>('getAdminOverview'); } catch (e) { console.warn(e); return {ok: true, kpis: {}, attention_items: []}; }
}

export async function getAdminPacing(): Promise<any> {
  if (!isLive()) return {ok: true, pacing: []};
  try { return await gatewayGet<any>('getAdminPacing'); } catch (e) { console.warn(e); return {ok: true, pacing: []}; }
}

export async function getAdminActivity(): Promise<any> {
  if (!isLive()) return {ok: true, activity: []};
  try { return await gatewayGet<any>('getAdminActivity'); } catch (e) { console.warn(e); return {ok: true, activity: []}; }
}

export async function getCalendarEvents(academic_year?: string): Promise<any> {
  if (!isLive()) return {ok: true, events: []};
  try { return await gatewayGet<any>('getCalendarEvents', { academic_year: academic_year || '' }); } catch (e) { console.warn(e); return {ok: true, events: []}; }
}

export async function upsertCalendarEvent(event_data: any): Promise<{ok: boolean}> {
  if (!isLive()) return {ok: true};
  try {
    const res = await gatewayPost<{ok: boolean}>('upsertCalendarEvent', { event_data });
    clearGatewayCache();
    return res;
  } catch(e) { console.warn(e); return {ok: true}; }
}

export async function deleteCalendarEvent(event_id: string): Promise<{ok: boolean}> {
  if (!isLive()) return {ok: true};
  try {
    const res = await gatewayGet<{ok: boolean}>('deleteCalendarEvent', { event_id });
    clearGatewayCache();
    return res;
  } catch(e) { console.warn(e); return {ok: true}; }
}

export async function getSchoolDayStructure(): Promise<any> {
  if (!isLive()) return {ok: true, structure: []};
  try { return await gatewayGet<any>('getSchoolDayStructure'); } catch (e) { console.warn(e); return {ok: true, structure: []}; }
}

export async function saveSchoolDayStructure(structure: any): Promise<{ok: boolean}> {
  if (!isLive()) return {ok: true};
  try {
    const res = await gatewayPost<{ok: boolean}>('saveSchoolDayStructure', { structure });
    clearGatewayCache();
    return res;
  } catch(e) { console.warn(e); return {ok: true}; }
}

export async function getTimetableForSection(class_id: string, section_id: string): Promise<any> {
  if (!isLive()) return {ok: true, slots: []};
  try { return await gatewayGet<any>('getTimetableForSection', { class_id, section_id }); } catch (e) { console.warn(e); return {ok: true, slots: []}; }
}

export async function saveTimetableGrid(class_id: string, section_id: string, slots: any[]): Promise<{ok: boolean}> {
  if (!isLive()) return {ok: true};
  try {
    const res = await gatewayPost<{ok: boolean}>('saveTimetableGrid', { class_id, section_id, slots });
    clearGatewayCache();
    return res;
  } catch(e) { console.warn(e); return {ok: true}; }
}

export async function cloneTimetable(source_class: string, source_section: string, target_class: string, target_section: string): Promise<{ok: boolean}> {
  if (!isLive()) return {ok: true};
  try {
    const res = await gatewayGet<{ok: boolean}>('cloneTimetable', { source_class, source_section, target_class, target_section });
    clearGatewayCache();
    return res;
  } catch(e) { console.warn(e); return {ok: true}; }
}

export async function getWorkbookRegistry(): Promise<any> {
  if (!isLive()) return {ok: true, registry: []};
  try { return await gatewayGet<any>('getWorkbookRegistry'); } catch (e) { console.warn(e); return {ok: true, registry: []}; }
}

export async function linkWorkbook(registry_data: any): Promise<{ok: boolean}> {
  if (!isLive()) return {ok: true};
  try {
    const res = await gatewayPost<{ok: boolean}>('linkWorkbook', { registry_data });
    clearGatewayCache();
    return res;
  } catch(e) { console.warn(e); return {ok: true}; }
}

export async function testWorkbookConnection(class_id: string, subject_id: string): Promise<any> {
  if (!isLive()) return {ok: true};
  try {
    return await gatewayGet<any>('testWorkbookConnection', { class_id, subject_id });
  } catch(e) { console.warn(e); return {ok: false, error: 'Connection failed'}; }
}


// ── Timetable Auto-Generation ─────────────────────────────────────────────

export async function getAllTimetableSlots(): Promise<{slots: any[]}> {
  if (!isLive()) return {slots: []}; // we can return mock data here if needed
  try { return await gatewayGet<{slots: any[]}>('getAllTimetableSlots'); } catch (e) { console.warn(e); return {slots: []}; }
}

export async function generateTimetable(payload: {class_id: string, section_id: string, frequencies: Record<string, number>}): Promise<{ok: boolean, proposed_slots?: any[]}> {
  if (!isLive()) {
    // Mock algorithm
    return { ok: true, proposed_slots: [] };
  }
  try {
    return await gatewayPost<{ok: boolean, proposed_slots?: any[]}>('generateTimetable', payload);
  } catch (e) {
    console.warn(e);
    return { ok: false };
  }
}
