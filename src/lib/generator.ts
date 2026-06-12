import { Question } from './bank';

export interface Blueprint {
  totalMarks: number;
  chapters: { num: number; target: number }[];
  easyPct: number;
  mediumPct: number;
  hardPct: number;
  selectedTypes: string[];
}

function targetMarks(total: number, pct: number) {
  return Math.max(1, Math.round((total * pct) / 100));
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function scoreCandidate(q: Question, selected: Question[], chapterTarget: number, diffTargets: Record<string, number>) {
  const chMrks = selected.filter(i => i.chapterNumber === q.chapterNumber).reduce((s, i) => s + i.marks, 0);
  const dfMrks = selected.filter(i => i.difficulty === q.difficulty).reduce((s, i) => s + i.marks, 0);
  return Math.max(0, chapterTarget - chMrks) * 3 +
    Math.max(0, (diffTargets[q.difficulty] || 0) - dfMrks) * 2 -
    q.marks - Number(q.timesAsked || 0);
}

export function generatePaper(
  pool: Question[],
  blueprint: Blueprint,
  lockedIds: Set<string>,
  existingSelection: Question[]
): Question[] {
  const { totalMarks, chapters, easyPct, mediumPct, hardPct, selectedTypes } = blueprint;

  const diffWeightSum = easyPct + mediumPct + hardPct;
  const diffTargets = {
    Easy: targetMarks(totalMarks, (easyPct / diffWeightSum) * 100 || 0),
    Medium: targetMarks(totalMarks, (mediumPct / diffWeightSum) * 100 || 0),
    Hard: targetMarks(totalMarks, (hardPct / diffWeightSum) * 100 || 0)
  };

  const available = pool.filter(q => q.useInPapers === 'Yes' && selectedTypes.includes(q.questionType));
  if (available.length === 0) return [];

  const locked = existingSelection.filter(q => lockedIds.has(q.id));
  const selected = [...locked];
  const used = new Set(selected.map(q => q.id));

  const chapterWeightSum = chapters.reduce((s, i) => s + i.target, 0);

  for (const p of chapters) {
    const chTarget = targetMarks(totalMarks, (p.target / chapterWeightSum) * 100 || 0);
    let chMrks = selected.filter(q => q.chapterNumber === p.num).reduce((s, q) => s + q.marks, 0);
    const chPool = shuffle(available.filter(q => q.chapterNumber === p.num && !used.has(q.id)));
    
    while (chMrks < chTarget && selected.reduce((s, q) => s + q.marks, 0) < totalMarks) {
      const rem = totalMarks - selected.reduce((s, q) => s + q.marks, 0);
      const candidates = chPool
        .filter(q => !used.has(q.id) && q.marks <= rem)
        .sort((a, b) => scoreCandidate(b, selected, chTarget, diffTargets) - scoreCandidate(a, selected, chTarget, diffTargets));
      if (!candidates.length) break;
      const next = candidates[0];
      selected.push(next);
      used.add(next.id);
      chMrks += next.marks;
    }
  }

  // Fill gap
  const remPool = shuffle(available.filter(q => chapters.some(p => p.num === q.chapterNumber) && !used.has(q.id)));
  for (const q of remPool) {
    const mrks = selected.reduce((s, i) => s + i.marks, 0);
    if (mrks >= totalMarks) break;
    if (q.marks <= totalMarks - mrks) { 
      selected.push(q); 
      used.add(q.id); 
    }
  }

  const typeOrder = ["MCQ", "Assertion-Reason", "Very Short Answer", "Short Answer", "Long Answer", "Case/Source-Based"];
  return selected.sort((a, b) => typeOrder.indexOf(a.questionType) - typeOrder.indexOf(b.questionType) || a.chapterNumber - b.chapterNumber);
}

export function replaceQuestion(
  sourceId: string, 
  pool: Question[], 
  currentSelection: Question[], 
  lockedIds: Set<string>
): Question[] {
  const old = currentSelection.find(q => q.id === sourceId);
  if (!old || lockedIds.has(sourceId)) return currentSelection;

  const used = new Set(currentSelection.map(q => q.id));
  const chapterPool = pool.filter(q => !used.has(q.id) && q.chapterNumber === old.chapterNumber && q.useInPapers === 'Yes');
  
  const best =
    chapterPool.find(q => q.difficulty === old.difficulty && q.questionType === old.questionType && q.marks === old.marks) ||
    chapterPool.find(q => q.difficulty === old.difficulty && q.marks === old.marks) ||
    chapterPool.find(q => q.marks === old.marks) ||
    chapterPool[0];

  if (!best) return currentSelection; // No replacement found

  return currentSelection.map(q => (q.id === sourceId ? best : q));
}
