import { useMemo } from 'react';
import { BankData } from '../lib/bank';

export function useQuestionFiltering(
  bank: BankData | null,
  klass: string,
  subject: string,
  initialTopic: string
) {
  const datasetOptions = useMemo(() => {
    if (!bank) return [];
    const map = new Map<string, { classLevel: string; subject: string }>();
    for (const q of bank.questions) {
      if (q.useInPapers !== 'Yes' || !q.classLevel || !q.subject) continue;
      map.set(`${q.classLevel}|${q.subject}`, { classLevel: q.classLevel, subject: q.subject });
    }
    return Array.from(map.values()).sort((a, b) =>
      a.classLevel.localeCompare(b.classLevel, undefined, { numeric: true }) || a.subject.localeCompare(b.subject)
    );
  }, [bank]);

  const availableClasses = useMemo(() => {
    const productClasses = bank?.product?.classes || [];
    return Array.from(new Set([...productClasses, ...datasetOptions.map(d => d.classLevel)]))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [bank, datasetOptions]);

  const availableSubjects = useMemo(() => {
    const productSubjects = bank?.product?.subjectsByClass?.[klass] || [];
    const datasetSubjects = datasetOptions.filter(d => d.classLevel === klass).map(d => d.subject);
    return Array.from(new Set([...productSubjects, ...datasetSubjects]))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [bank, datasetOptions, klass]);

  const baseActiveQuestions = useMemo(() => {
    return bank ? bank.questions.filter(q => q.classLevel === klass && q.subject === subject && q.useInPapers === 'Yes') : [];
  }, [bank, klass, subject]);

  const hasTopicQuestions = useMemo(() => {
    return initialTopic ? baseActiveQuestions.some(q => q.topic === initialTopic) : false;
  }, [baseActiveQuestions, initialTopic]);

  const activeQuestions = useMemo(() => {
    return hasTopicQuestions 
      ? baseActiveQuestions.filter(q => q.topic === initialTopic) 
      : baseActiveQuestions;
  }, [baseActiveQuestions, hasTopicQuestions, initialTopic]);
  
  const showTopicFallbackWarning = initialTopic && !hasTopicQuestions;

  const chapterOptions = useMemo(() => {
    if (!bank) return [];
    const map = new Map<number, { num: number; name: string; count: number }>();
    for (const chapter of bank.chapters) {
      if (chapter.classLevel !== klass || chapter.subject !== subject || !chapter.chapterNumber) continue;
      map.set(chapter.chapterNumber, {
        num: chapter.chapterNumber,
        name: chapter.chapterName || `Chapter ${chapter.chapterNumber}`,
        count: 0
      });
    }
    for (const question of activeQuestions) {
      if (!question.chapterNumber) continue;
      const existing = map.get(question.chapterNumber);
      map.set(question.chapterNumber, {
        num: question.chapterNumber,
        name: existing?.name || question.chapterName || `Chapter ${question.chapterNumber}`,
        count: (existing?.count || 0) + 1
      });
    }
    return Array.from(map.values()).filter(chapter => chapter.count > 0).sort((a,b)=>a.num-b.num);
  }, [bank, klass, subject, activeQuestions]);

  const availableChapters = chapterOptions.map(chapter => chapter.num);
  const hasQuestions = availableChapters.length > 0;

  return {
    datasetOptions,
    availableClasses,
    availableSubjects,
    activeQuestions,
    hasTopicQuestions,
    showTopicFallbackWarning,
    chapterOptions,
    availableChapters,
    hasQuestions,
    totalUsableQuestions: bank ? bank.questions.filter(q => q.useInPapers === 'Yes').length : 0,
    totalDatasets: datasetOptions.length,
    activeChapterCount: availableChapters.length,
  };
}
