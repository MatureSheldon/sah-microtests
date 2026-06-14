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

function scoreCandidate(
  q: Question,
  chMrks: number,
  dfMrks: number,
  tpMrks: number,
  chapterTarget: number,
  diffTargets: Record<string, number>,
  typeTargets: Record<string, number>
) {
  const chBonus = chapterTarget - chMrks;
  const dfBonus = (diffTargets[q.difficulty] || 0) - dfMrks;
  const tpBonus = (typeTargets[q.questionType] || 0) - tpMrks;

  const chScore = chBonus > 0 ? chBonus * 3 : chBonus * 8;
  const tpScore = tpBonus > 0 ? tpBonus * 4 : tpBonus * 10;
  
  return chScore + dfBonus * 2 + tpScore - q.marks - Number(q.timesAsked || 0);
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

  const typeWeightSum = selectedTypes.length;
  const typeTargets: Record<string, number> = {};
  if (typeWeightSum > 0) {
    for (const t of selectedTypes) {
      typeTargets[t] = targetMarks(totalMarks, (1 / typeWeightSum) * 100);
    }
  }

  const available = pool.filter(q => q.useInPapers === 'Yes' && selectedTypes.includes(q.questionType));
  if (available.length === 0) return [];

  const locked = existingSelection.filter(q => lockedIds.has(q.id));
  const selected = [...locked];
  const used = new Set(selected.map(q => q.id));

  const rawChapterWeightSum = chapters.reduce((s, i) => s + i.target, 0);
  const chapterWeightSum = rawChapterWeightSum === 0 ? chapters.length : rawChapterWeightSum;

  for (const p of chapters) {
    const targetVal = rawChapterWeightSum === 0 ? 1 : p.target;
    const chTarget = targetMarks(totalMarks, (targetVal / chapterWeightSum) * 100 || 0);
    let chMrks = selected.filter(q => q.chapterNumber === p.num).reduce((s, q) => s + q.marks, 0);
    const chPool = shuffle(available.filter(q => q.chapterNumber === p.num && !used.has(q.id)));
    
    let currentTotalMarks = selected.reduce((s, q) => s + q.marks, 0);
    while (chMrks < chTarget && currentTotalMarks < totalMarks) {
      const rem = totalMarks - currentTotalMarks;
      
      const chMrksLookups: Record<number, number> = {};
      const dfMrksLookups: Record<string, number> = {};
      const typeMrksLookups: Record<string, number> = {};
      for (const sq of selected) {
        chMrksLookups[sq.chapterNumber] = (chMrksLookups[sq.chapterNumber] || 0) + sq.marks;
        dfMrksLookups[sq.difficulty] = (dfMrksLookups[sq.difficulty] || 0) + sq.marks;
        typeMrksLookups[sq.questionType] = (typeMrksLookups[sq.questionType] || 0) + sq.marks;
      }
      
      const getScore = (q: Question) => scoreCandidate(
        q,
        chMrksLookups[q.chapterNumber] || 0,
        dfMrksLookups[q.difficulty] || 0,
        typeMrksLookups[q.questionType] || 0,
        chTarget,
        diffTargets,
        typeTargets
      );

      const candidates = chPool
        .filter(q => !used.has(q.id) && q.marks <= rem)
        .sort((a, b) => getScore(b) - getScore(a));
      if (!candidates.length) break;
      const next = candidates[0];
      selected.push(next);
      used.add(next.id);
      chMrks += next.marks;
      currentTotalMarks += next.marks;
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
