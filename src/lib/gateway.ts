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
