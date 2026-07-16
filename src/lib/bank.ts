export interface Question {
  id: string;
  classLevel: string;
  subject: string;
  chapterNumber: number;
  chapterName: string;
  topic: string;
  questionType: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  marks: number;
  question: string;
  options?: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  imageUrl?: string;
  timesAsked?: number;
  useInPapers: 'Yes' | 'No';
  // Legacy asset columns
  assetFormat?: string;
  assetData?: string;
  assetPlacement?: string;
  assetWidth?: number;
  assetHeight?: number;
}

export interface BankData {
  questions: Question[];
  chapters: Array<{
    classLevel: string;
    subject: string;
    chapterNumber: number;
    chapterName: string;
    section?: string;
  }>;
  product?: {
    classes: string[];
    subjectsByClass: Record<string, string[]>;
  };
  connection?: {
    source: 'google-sheets' | 'cached-google-sheets' | 'fallback';
    fetchedAt?: string;
    loadMs?: number;
    reason?: string;
  };
}

export const SHEETS_URL_STORAGE_KEY = 'sah-sheets-url';
export const SHEETS_PASSCODE_STORAGE_KEY = 'sah-sheets-passcode';

const CACHE_KEY = 'sah.questionBank.live.v1';
const CACHE_TTL_MS = 30 * 60 * 1000;

export function getStoredBankSettings() {
  if (typeof window === 'undefined') return { url: '', passcode: '' };
  return {
    url: window.localStorage.getItem(SHEETS_URL_STORAGE_KEY) || '',
    passcode: window.localStorage.getItem(SHEETS_PASSCODE_STORAGE_KEY) || ''
  };
}

export function saveStoredBankSettings(url: string, passcode: string) {
  if (typeof window === 'undefined') return;
  const cleanUrl = String(url || '').trim();
  const cleanPasscode = String(passcode || '').trim();
  if (cleanUrl) window.localStorage.setItem(SHEETS_URL_STORAGE_KEY, cleanUrl);
  else window.localStorage.removeItem(SHEETS_URL_STORAGE_KEY);
  if (cleanPasscode) window.localStorage.setItem(SHEETS_PASSCODE_STORAGE_KEY, cleanPasscode);
  else window.localStorage.removeItem(SHEETS_PASSCODE_STORAGE_KEY);
}

export function clearQuestionBankCache() {
  if (typeof window === 'undefined') return;
  for (const store of [window.localStorage, window.sessionStorage]) {
    for (let index = store.length - 1; index >= 0; index -= 1) {
      const key = store.key(index);
      if (key && key.startsWith(CACHE_KEY)) store.removeItem(key);
    }
  }
}

function normalizeSubject(value: unknown): string {
  const subject = String(value || '').trim();
  if (/^(maths|math|mathematics)$/i.test(subject)) return 'Mathematics';
  if (/^(sci|science)$/i.test(subject)) return 'Science';
  return subject;
}

function normalizeClass(value: unknown): string {
  return String(value || '').replace(/^Class\s+/i, '').trim();
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function normalizeQuestion(raw: any): Question {
  const options = raw.options || {
    A: raw['Option A'] || raw['option a'] || raw.option_a || raw.optionA || '',
    B: raw['Option B'] || raw['option b'] || raw.option_b || raw.optionB || '',
    C: raw['Option C'] || raw['option c'] || raw.option_c || raw.optionC || '',
    D: raw['Option D'] || raw['option d'] || raw.option_d || raw.optionD || '',
  };
  
  // Dev-only debug block for the image pipeline - log first row unconditionally
  if (raw.rowNumber === 1 || raw.id === '1' || raw['Question ID'] === '1' || raw['question id'] === '1' || !window._loggedFirstRow) {
    if (typeof window !== 'undefined') window._loggedFirstRow = true;
    console.log('[DEBUG] normalizeQuestion first row keys:', {
      questionId: raw.id || raw['Question ID'] || raw['question id'],
      rawKeys: Object.keys(raw),
      rawObj: raw
    });
  }

    const rawImg = String(
      raw.imageUrl ||
      raw.image_url ||
      raw['Image URL'] ||
      raw['image url'] ||
      raw['Question Image'] ||
      raw['Question Image URL'] ||
      raw['Diagram'] ||
      raw['Diagram URL'] ||
      raw['Figure'] ||
      raw['Image'] ||
      raw.assetData ||
      raw['Asset Data'] ||
      raw['asset data'] ||
      ''
    ).trim();

    let imageUrl = rawImg;
    if (imageUrl.includes('drive.google.com/file/d/')) {
      const match = imageUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        imageUrl = `https://drive.google.com/uc?export=view&id=${match[1]}`;
      }
    }

      let questionText = String(raw.question || raw.Question || raw.question || '').trim();
      
      // Extract Mermaid diagrams embedded in the text as "Image: flowchart LR..."
      const mermaidMatch = questionText.match(/Image:\s*(flowchart|graph|pie|sequenceDiagram|stateDiagram|classDiagram|erDiagram|gantt|journey|gitGraph|mindmap|timeline)[ \S\s]*/i);
      if (mermaidMatch) {
        if (!imageUrl) {
          imageUrl = mermaidMatch[0].replace(/^Image:\s*/i, '').trim();
        }
        questionText = questionText.substring(0, mermaidMatch.index).trim();
      }

      return {
      ...raw,
      id: String(raw.id || raw['Question ID'] || raw['question id'] || raw.question_id || '').trim(),
      classLevel: normalizeClass(raw.classLevel || raw.Class || raw.class),
      subject: normalizeSubject(raw.subject || raw.Subject || raw.subject),
      chapterNumber: Number(raw.chapterNumber || raw['Chapter No.'] || raw['Chapter No'] || raw['chapter no.'] || raw.chapter_no || 0),
      chapterName: String(raw.chapterName || raw.Chapter || raw['Chapter Name'] || raw['chapter name'] || '').trim(),
      topic: String(raw.topic || raw.Topic || raw.topic || '').trim(),
      questionType: String(raw.questionType || raw['Question Type'] || raw['question type'] || raw.question_type || '').trim(),
      difficulty: String(raw.difficulty || raw.Difficulty || raw.difficulty || 'Easy').trim() as Question['difficulty'],
      marks: Number(raw.marks || raw.Marks || raw.marks || 1),
      question: questionText,
      options: (options.A || options.B || options.C || options.D) ? options : undefined,
      imageUrl,
      timesAsked: Number(raw.timesAsked || raw['Times Asked'] || raw['times asked'] || raw.times_asked || 0),
      useInPapers: String(raw.useInPapers || raw['Use in Papers'] || raw['use in papers'] || raw.use_in_papers || 'Yes').trim() === 'No' ? 'No' : 'Yes',
      
      // Same-row assets:
      assetFormat: String(raw.assetFormat || raw['Asset Format'] || raw['asset format'] || raw.asset_format || '').trim(),
      assetData: String(raw.assetData || raw['Asset Data'] || raw['asset data'] || raw.asset_data || '').trim(),
      assetPlacement: String(raw.assetPlacement || raw['Asset Placement'] || raw['asset placement'] || raw.asset_placement || '').trim(),
      assetWidth: raw.assetWidth !== undefined ? raw.assetWidth : (raw['Asset Width'] !== undefined ? raw['Asset Width'] : (raw['asset width'] !== undefined ? raw['asset width'] : undefined)),
      assetHeight: raw.assetHeight !== undefined ? raw.assetHeight : (raw['Asset Height'] !== undefined ? raw['Asset Height'] : (raw['asset height'] !== undefined ? raw['asset height'] : undefined)),
    };
}

function normalizeChapter(raw: any) {
  return {
    ...raw,
    classLevel: normalizeClass(raw.classLevel || raw.Class || raw.class),
    subject: normalizeSubject(raw.subject || raw.Subject),
    chapterNumber: Number(raw.chapterNumber || raw['Chapter No.'] || raw['Chapter No'] || 0),
    chapterName: String(raw.chapterName || raw.Chapter || raw['Chapter Name'] || '').trim(),
    section: raw.section
  };
}

function normalizeBankData(raw: any, connection?: BankData['connection']): BankData {
  const questions = (Array.isArray(raw?.questions) ? raw.questions : []).map(normalizeQuestion);
  const chapters = (Array.isArray(raw?.chapters) ? raw.chapters : []).map(normalizeChapter);

  const product = raw?.product || {};
  const subjectsByClass: Record<string, string[]> = {};

  for (const [klass, subjects] of Object.entries(product.subjectsByClass || {})) {
    subjectsByClass[normalizeClass(klass)] = uniqueSorted((subjects as unknown[]).map(normalizeSubject));
  }

  for (const q of questions) {
    subjectsByClass[q.classLevel] = uniqueSorted([...(subjectsByClass[q.classLevel] || []), q.subject]);
  }
  for (const ch of chapters) {
    subjectsByClass[ch.classLevel] = uniqueSorted([...(subjectsByClass[ch.classLevel] || []), ch.subject]);
  }

  return {
    questions,
    chapters,
    product: {
      ...product,
      classes: uniqueSorted([...(product.classes || []).map(normalizeClass), ...questions.map(q => q.classLevel), ...chapters.map(c => c.classLevel)]),
      subjectsByClass
    },
    connection
  };
}

function cacheKey(scope?: BankRequest) {
  const klass = scope?.classLevel ? normalizeClass(scope.classLevel) : 'all';
  const subject = scope?.subject ? normalizeSubject(scope.subject).replace(/\s+/g, '-') : 'all';
  return `${CACHE_KEY}.${klass}.${subject}`;
}

export interface BankRequest {
  classLevel?: string;
  subject?: string;
}

function readCachedLiveBank(scope?: BankRequest): BankData | null {
  try {
    const key = cacheKey(scope);
    const cached = window.sessionStorage.getItem(key) || window.localStorage.getItem(key);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    if (!parsed?.savedAt || Date.now() - Number(parsed.savedAt) > CACHE_TTL_MS) return null;
    return normalizeBankData(parsed.data, {
      source: 'cached-google-sheets',
      fetchedAt: new Date(Number(parsed.savedAt)).toISOString(),
      loadMs: 0
    });
  } catch {
    return null;
  }
}

function writeCachedLiveBank(data: any, scope?: BankRequest) {
  try {
    const payload = JSON.stringify({ savedAt: Date.now(), data });
    const key = cacheKey(scope);
    window.sessionStorage.setItem(key, payload);
    window.localStorage.setItem(key, payload);
  } catch {
    // Cache is an optimization only; ignore quota/private-mode failures.
  }
}

/**
 * Fetches from the live Google Apps Script endpoint if configured.
 * Falls back to the static bundled JSON if the environment variable is missing.
 */
export async function fetchQuestionBank(scope?: BankRequest): Promise<BankData> {
  const stored = getStoredBankSettings();
  const url = stored.url || import.meta.env.VITE_GOOGLE_SHEETS_URL || '';
  const passcode = stored.passcode || import.meta.env.VITE_BANK_PASSCODE || '';

  if (url) {
    const cached = readCachedLiveBank(scope);
    if (cached) return cached;

    const started = performance.now();
    const fetchUrl = new URL(url);
    fetchUrl.searchParams.set('action', 'getBank');
    if (passcode) fetchUrl.searchParams.set('passcode', passcode);
    if (scope?.classLevel) fetchUrl.searchParams.set('classLevel', normalizeClass(scope.classLevel));
    if (scope?.subject) fetchUrl.searchParams.set('subject', normalizeSubject(scope.subject));
    const res = await fetch(fetchUrl.toString());
    if (!res.ok) throw new Error('Failed to load question bank from live Google Sheets');
    const data = await res.json();
    if (!data || data.ok === false) {
      throw new Error(data.error || 'Unknown error loading live bank data');
    }
    const normalized = normalizeBankData(data, {
      source: 'google-sheets',
      fetchedAt: new Date().toISOString(),
      loadMs: Math.round(performance.now() - started)
    });

    if (normalized.questions.length === 0 && (scope?.classLevel || scope?.subject)) {
      const broadFetchUrl = new URL(url);
      broadFetchUrl.searchParams.set('action', 'getBank');
      if (passcode) broadFetchUrl.searchParams.set('passcode', passcode);
      const broadRes = await fetch(broadFetchUrl.toString());
      if (broadRes.ok) {
        const broadData = await broadRes.json();
        if (broadData && broadData.ok !== false) {
          writeCachedLiveBank(broadData);
          return normalizeBankData(broadData, {
            source: 'google-sheets',
            fetchedAt: new Date().toISOString(),
            loadMs: Math.round(performance.now() - started)
          });
        }
      }
    }

    writeCachedLiveBank(data, scope);
    return normalized;
  }

  const res = await fetch(import.meta.env.BASE_URL + 'fallback-bank.json');
  if (!res.ok) throw new Error('Failed to load local fallback question bank');
  const data = await res.json();
  return normalizeBankData(data, { source: 'fallback', reason: url ? 'Google Sheets unavailable' : 'No Google Sheets URL configured' });
}
