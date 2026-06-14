import { useEffect } from 'react';
import { useMicrotestState } from '../hooks/useMicrotestState';
import { useQuestionFiltering } from '../hooks/useQuestionFiltering';
import { MicrotestConfigPanel } from '../components/microtest/MicrotestConfigPanel';
import { ChapterWeightPanel } from '../components/microtest/ChapterWeightPanel';
import { QuestionPreviewPanel } from '../components/microtest/QuestionPreviewPanel';
import { generatePaper, replaceQuestion } from '../lib/generator';

export function MicrotestBuilder() {
  const state = useMicrotestState();
  const filtering = useQuestionFiltering(state.bank, state.klass, state.subject, state.initialTopic);

  const {
    activeQuestions, availableChapters, availableSubjects
  } = filtering;

  const {
    klass, subject, setSubject, setChapters, chapters,
    totalMarks, easyPct, mediumPct, hardPct, selectedTypes,
    lockedIds, selectedQuestions, setSelectedQuestions,
    testNumber, duration, setExporting, loading, error, loadStartedAt, initialClass, initialSubject
  } = state;

  // Auto-reset chapters if the selected class/subject has no matching chapters currently selected
  useEffect(() => {
    if (availableChapters.length > 0) {
      setChapters(prev => prev.length
        ? prev.map(ch => availableChapters.includes(ch.num) ? ch : { ...ch, num: availableChapters[0] })
        : [{ id: 'c1', num: availableChapters[0], target: 100 }]
      );
    } else {
      setChapters([]);
    }
  }, [klass, subject, availableChapters.join(',')]);

  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.includes(subject)) {
      setSubject(availableSubjects[0]);
    }
  }, [availableSubjects, subject]);

  const handleGenerate = () => {
    const blueprint = { totalMarks, chapters, easyPct, mediumPct, hardPct, selectedTypes };
    const result = generatePaper(activeQuestions, blueprint, lockedIds, selectedQuestions);
    setSelectedQuestions(result);
  };

  const handleSwap = (id: string) => {
    const result = replaceQuestion(id, activeQuestions, selectedQuestions, lockedIds);
    setSelectedQuestions(result);
  };

  const handleLock = (id: string) => {
    const newLocks = new Set(lockedIds);
    if (newLocks.has(id)) newLocks.delete(id);
    else newLocks.add(id);
    state.setLockedIds(newLocks);
  };

  const handleRemove = (id: string) => {
    setSelectedQuestions(selectedQuestions.filter(q => q.id !== id));
    const newLocks = new Set(lockedIds);
    newLocks.delete(id);
    state.setLockedIds(newLocks);
  };

  const handleExport = async () => {
    const chapterStr = chapters.map(c => `Ch ${c.num} (${c.target}%)`).join(', ');
    setExporting(true);
    try {
      const { exportDocx } = await import('../lib/export');
      await exportDocx(selectedQuestions, {
        testNumber,
        classLevel: klass,
        subject,
        durationMinutes: duration,
        totalMarks,
        chapters: chapterStr
      });
    } finally {
      setExporting(false);
    }
  };

  const extendedState = {
    ...state,
    handleGenerate,
    handleSwap,
    handleLock,
    handleRemove,
    handleExport,
  };

  if (loading) {
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - loadStartedAt) / 1000));
    return (
      <div className="max-w-[1600px] w-full grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-8 items-start">
        <div className="flex flex-col gap-6 animate-pulse">
          <div className="h-[250px] bg-white border border-slate-100 rounded-2xl shadow-sm p-6" />
          <div className="h-[200px] bg-white border border-slate-100 rounded-2xl shadow-sm p-6" />
          <div className="h-[300px] bg-white border border-slate-100 rounded-2xl shadow-sm p-6" />
        </div>
        <div className="bg-white border border-border-subtle rounded-2xl shadow-sm p-8 min-h-[360px] flex flex-col justify-center text-center">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-brand-accent mb-2">Connecting to Question Bank</p>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Loading Class {initialClass} {initialSubject} questions...</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Live Google Sheets may take a few seconds on the first load. After the first successful load, this bank is cached locally for faster revisits.
          </p>
          <p className="text-[12px] text-slate-400 mt-4">Waiting {elapsedSeconds}s</p>
        </div>
      </div>
    );
  }
  if (error) {
    return <div className="p-8 text-red-500 font-medium">Error loading bank: {error}</div>;
  }
  if (!state.bank) return null;

  return (
    <div className="max-w-[1600px] w-full grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-8 items-start">
      <div className="flex flex-col gap-6">
        <MicrotestConfigPanel state={extendedState} filtering={filtering} bank={state.bank} />
        <ChapterWeightPanel state={extendedState} filtering={filtering} />
      </div>
      <div className="flex flex-col gap-6">
        <QuestionPreviewPanel state={extendedState} filtering={filtering} />
      </div>
    </div>
  );
}
