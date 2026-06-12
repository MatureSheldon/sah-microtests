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
}

/**
 * Fetches from the live Google Apps Script endpoint if configured.
 * Falls back to the static bundled JSON if the environment variable is missing.
 */
export async function fetchQuestionBank(): Promise<BankData> {
  const url = import.meta.env.VITE_GOOGLE_SHEETS_URL;
  const passcode = import.meta.env.VITE_BANK_PASSCODE || '';

  if (url) {
    const fetchUrl = passcode ? `${url}?action=getBank&passcode=${encodeURIComponent(passcode)}` : `${url}?action=getBank`;
    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error('Failed to load question bank from live Google Sheets');
    const data = await res.json();
    if (!data || data.ok === false) {
      throw new Error(data.error || 'Unknown error loading live bank data');
    }
    return {
      questions: data.questions || [],
      chapters: data.chapters || [],
      product: data.product || undefined
    };
  }

  // Fallback to bundled local JSON
  const res = await fetch('/fallback-bank.json');
  if (!res.ok) throw new Error('Failed to load local fallback question bank');
  const data = await res.json();
  
  // Basic validation/normalization
  return {
    questions: data.questions || [],
    chapters: data.chapters || [],
    product: data.product || undefined
  };
}
