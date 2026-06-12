import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { BankData, clearQuestionBankCache, fetchQuestionBank, getStoredBankSettings, Question, saveStoredBankSettings } from '../lib/bank';
import { generatePaper, replaceQuestion } from '../lib/generator';
import { renderMarkdownToHtml } from '../lib/utils';

export function MicrotestBuilder() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialClass = searchParams.get('class') || '9';
  const normalizeSubject = (value: string) => /^(maths|math)$/i.test(String(value || '').trim()) ? 'Mathematics' : String(value || '').trim();
  const initialSubject = normalizeSubject(searchParams.get('subject') || 'Mathematics');
  const initialChapter = searchParams.get('chapter') || '';
  const initialChapterNumber = Number(initialChapter.match(/\d+/)?.[0] || 1);

  const [bank, setBank] = useState<BankData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadStartedAt] = useState(() => Date.now());
  const [settings, setSettings] = useState(() => getStoredBankSettings());
  const [settingsOpen, setSettingsOpen] = useState(() => !getStoredBankSettings().url && !import.meta.env.VITE_GOOGLE_SHEETS_URL);
  const [bankStatus, setBankStatus] = useState('Connecting...');

  // Document Profile State
  const [klass, setKlass] = useState(initialClass);
  const [subject, setSubject] = useState(initialSubject);
  const [testNumber, setTestNumber] = useState(1);
  const [totalMarks, setTotalMarks] = useState(20);
  const [duration, setDuration] = useState(30);

  // Blueprint State
  const [chapters, setChapters] = useState<{ id: string; num: number; target: number }[]>([
    { id: 'c1', num: initialChapterNumber, target: 100 }
  ]);

  // Parameters State
  const [easyPct, setEasyPct] = useState(40);
  const [mediumPct, setMediumPct] = useState(40);
  const [hardPct, setHardPct] = useState(20);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [demoMode, setDemoMode] = useState(false);

  // Preview State
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
  const [topicModal, setTopicModal] = useState<{ sourceId: string; selectedType: string | null } | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadBank = (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    setBankStatus(forceRefresh ? 'Refreshing...' : 'Connecting...');
    if (forceRefresh) clearQuestionBankCache();

    fetchQuestionBank().then((data) => {
      setBank(data);
      const types = Array.from(new Set(data.questions.map(q => q.questionType))).filter(Boolean);
      setSelectedTypes(types);
      const sourceLabel = data.connection?.source === 'google-sheets'
        ? 'Google Sheets connected'
        : data.connection?.source === 'cached-google-sheets'
          ? 'Google Sheets cached'
          : 'Local fallback file';
      setBankStatus(sourceLabel);
      setLoading(false);
    }).catch((err) => {
      console.error(err);
      setError(err.message || String(err));
      setBankStatus('Connection failed');
      setLoading(false);
    });
  };

  useEffect(() => {
    loadBank();
  }, []);

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

  const activeQuestions = bank ? bank.questions.filter(q => q.classLevel === klass && q.subject === subject && q.useInPapers === 'Yes') : [];
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
  if (!bank) return null;

  const handleGenerate = () => {
    const blueprint = {
      totalMarks,
      chapters,
      easyPct,
      mediumPct,
      hardPct,
      selectedTypes
    };
    const pool = activeQuestions;
    const result = generatePaper(pool, blueprint, lockedIds, selectedQuestions);
    setSelectedQuestions(result);
  };

  const handleSwap = (id: string) => {
    const pool = activeQuestions;
    const result = replaceQuestion(id, pool, selectedQuestions, lockedIds);
    setSelectedQuestions(result);
  };

  const handleLock = (id: string) => {
    const newLocks = new Set(lockedIds);
    if (newLocks.has(id)) newLocks.delete(id);
    else newLocks.add(id);
    setLockedIds(newLocks);
  };

  const handleRemove = (id: string) => {
    setSelectedQuestions(selectedQuestions.filter(q => q.id !== id));
    const newLocks = new Set(lockedIds);
    newLocks.delete(id);
    setLockedIds(newLocks);
  };

  const sourceTopicQuestion = topicModal ? selectedQuestions.find(q => q.id === topicModal.sourceId) : null;
  const topicPool = sourceTopicQuestion
    ? activeQuestions.filter(q =>
      q.useInPapers === 'Yes' &&
      q.id !== sourceTopicQuestion.id &&
      q.topic === sourceTopicQuestion.topic &&
      !selectedQuestions.some(selected => selected.id === q.id)
    )
    : [];
  const topicTypeCounts = topicPool.reduce<Record<string, number>>((counts, q) => {
    counts[q.questionType] = (counts[q.questionType] || 0) + 1;
    return counts;
  }, {});
  const topicTypes = Object.keys(topicTypeCounts).sort();

  const openTopicModal = (sourceId: string) => {
    const source = selectedQuestions.find(q => q.id === sourceId);
    if (!source) return;
    const used = new Set(selectedQuestions.map(q => q.id));
    const sameTopicPool = activeQuestions.filter(q =>
      q.useInPapers === 'Yes' &&
      q.id !== source.id &&
      q.topic === source.topic &&
      !used.has(q.id)
    );
    const types = Array.from(new Set(sameTopicPool.map(q => q.questionType))).sort();
    setTopicModal({
      sourceId,
      selectedType: types.includes(source.questionType) ? source.questionType : types[0] || null
    });
  };

  const topicReplacement = () => {
    if (!topicModal || !sourceTopicQuestion || !topicModal.selectedType) return null;
    const candidates = topicPool.filter(q => q.questionType === topicModal.selectedType);
    return candidates.find(q => q.difficulty === sourceTopicQuestion.difficulty && q.marks === sourceTopicQuestion.marks) ||
      candidates.find(q => q.marks === sourceTopicQuestion.marks) ||
      candidates[0] ||
      null;
  };

  const handleTopicSwap = () => {
    if (!topicModal || lockedIds.has(topicModal.sourceId)) return;
    const replacement = topicReplacement();
    if (!replacement) return;
    setSelectedQuestions(selectedQuestions.map(q => q.id === topicModal.sourceId ? replacement : q));
    setTopicModal(null);
  };

  const handleTopicAdd = () => {
    if (!topicModal) return;
    const addition = topicReplacement();
    if (!addition) return;
    const sourceIndex = selectedQuestions.findIndex(q => q.id === topicModal.sourceId);
    const nextQuestions = [...selectedQuestions];
    if (sourceIndex >= 0) nextQuestions.splice(sourceIndex + 1, 0, addition);
    else nextQuestions.push(addition);
    setSelectedQuestions(nextQuestions);
    setTopicModal(null);
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

  const totalUsableQuestions = bank.questions.filter(q => q.useInPapers === 'Yes').length;
  const totalDatasets = datasetOptions.length;
  const activeChapterCount = availableChapters.length;
  const chapterTargetTotal = chapters.reduce((sum, chapter) => sum + Math.max(0, Number(chapter.target) || 0), 0);
  const chapterColors = ['bg-brand-accent', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500', 'bg-cyan-500'];
  const chapterLabel = (num: number) => {
    const option = chapterOptions.find(chapter => chapter.num === num);
    return option?.name ? `Ch ${num}: ${option.name}` : `Chapter ${num}`;
  };
  const currentMarks = selectedQuestions.reduce((s, q) => s + q.marks, 0);

  const handleSaveSettings = () => {
    saveStoredBankSettings(settings.url, settings.passcode);
    setSettingsOpen(false);
    loadBank(true);
  };

  const handleAddChapter = () => {
    const used = new Set(chapters.map(chapter => chapter.num));
    const nextChapter = availableChapters.find(chapter => !used.has(chapter)) || availableChapters[0] || 1;
    if (!chapters.length) {
      setChapters([{ id: Math.random().toString(), num: nextChapter, target: 100 }]);
      return;
    }

    const newTarget = 10;
    const largestIndex = chapters.reduce((bestIndex, chapter, index) =>
      chapter.target > chapters[bestIndex].target ? index : bestIndex
    , 0);
    const rebalanced = chapters.map((chapter, index) => index === largestIndex
      ? { ...chapter, target: Math.max(0, chapter.target - newTarget) }
      : chapter
    );
    setChapters([...rebalanced, { id: Math.random().toString(), num: nextChapter, target: newTarget }]);
  };

  return (
    <div className="max-w-[1600px] w-full grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-8 items-start">
      {/* Left Column: Builder */}
      <div className="flex flex-col gap-6">
        
        {/* Document Profile */}
        <section className="bg-white border border-border-subtle rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center gap-3">
            <div>
              <h2 className="text-[13px] font-semibold text-brand-primary uppercase tracking-wider">Document Profile</h2>
              <p className="mt-1 text-[11px] text-slate-500">
                {bankStatus} · {totalUsableQuestions} usable questions · {totalDatasets} dataset{totalDatasets === 1 ? '' : 's'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => loadBank(true)} className="px-2 py-1 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50">Refresh</button>
              <button onClick={() => setSettingsOpen(!settingsOpen)} className="px-2 py-1 text-[11px] font-semibold text-brand-accent bg-brand-accent/10 rounded hover:bg-brand-accent/20">Settings</button>
            </div>
          </div>
          <div className="p-6">
            {settingsOpen && (
              <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                <div className="grid gap-3">
                  <label className="flex flex-col gap-1.5 text-[12px] font-medium text-slate-700">
                    Google Apps Script URL
                    <input value={settings.url} onChange={e => setSettings({ ...settings, url: e.target.value })} placeholder="https://script.google.com/macros/s/.../exec" className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-[12px] outline-none" />
                  </label>
                  <label className="flex flex-col gap-1.5 text-[12px] font-medium text-slate-700">
                    Passcode optional
                    <input value={settings.passcode} onChange={e => setSettings({ ...settings, passcode: e.target.value })} placeholder="Leave blank if not configured" className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-[12px] outline-none" />
                  </label>
                  <div className="flex items-center gap-2">
                    <button onClick={handleSaveSettings} className="px-3 py-2 bg-brand-accent text-white text-[12px] font-semibold rounded-lg">Save & reconnect</button>
                    <button onClick={() => setSettingsOpen(false)} className="px-3 py-2 bg-white border border-slate-200 text-slate-600 text-[12px] font-semibold rounded-lg">Close</button>
                  </div>
                </div>
              </div>
            )}
            <div className="mb-4 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-[12px] text-slate-600">
              Active bank: <strong>{activeQuestions.length}</strong> usable questions · <strong>{activeChapterCount}</strong> chapter{activeChapterCount === 1 ? '' : 's'}
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <label className="flex flex-col gap-1.5 text-[12px] font-medium text-slate-700">
                Class
                <select 
                  value={klass} 
                  onChange={e => setKlass(e.target.value)}
                  className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] outline-none"
                >
                  {availableClasses.map(c => <option key={c} value={c}>Class {c}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-[12px] font-medium text-slate-700">
                Subject
                <select 
                  value={subject} 
                  onChange={e => setSubject(normalizeSubject(e.target.value))}
                  className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] outline-none"
                >
                  {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <label className="flex flex-col gap-1.5 text-[12px] font-medium text-slate-700">
                Test No.
                <input type="number" value={testNumber} onChange={e => setTestNumber(Number(e.target.value))} className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] outline-none" />
              </label>
              <label className="flex flex-col gap-1.5 text-[12px] font-medium text-slate-700">
                Total Marks
                <input type="number" value={totalMarks} onChange={e => setTotalMarks(Number(e.target.value))} className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] outline-none" />
              </label>
              <label className="flex flex-col gap-1.5 text-[12px] font-medium text-slate-700">
                Duration (m)
                <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[13px] outline-none" />
              </label>
            </div>
          </div>
        </section>

        {/* Chapter Blueprint */}
        <section className="bg-white border border-border-subtle rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h2 className="text-[13px] font-semibold text-brand-primary uppercase tracking-wider">Chapter Blueprint</h2>
            <button 
              onClick={handleAddChapter}
              className="px-2 py-1 text-[11px] font-semibold text-brand-accent bg-brand-accent/10 rounded hover:bg-brand-accent/20 transition-colors disabled:opacity-50"
              disabled={!hasQuestions}
            >
              + Add
            </button>
          </div>
          <div className="p-6">
            {!hasQuestions ? (
              <p className="text-[12px] text-slate-500 italic py-2 text-center bg-slate-50 rounded-lg">
                No questions available for Class {klass} {subject}. Connected bank currently has: {datasetOptions.map(d => `Class ${d.classLevel} ${d.subject}`).join(', ') || 'no usable datasets'}.
              </p>
            ) : (
              <div className="flex flex-col gap-3 mb-4">
                <div className="overflow-hidden rounded-full bg-slate-100 border border-slate-200 h-3 flex">
                  {chapters.map((ch, i) => (
                    <div
                      key={ch.id}
                      className={`${chapterColors[i % chapterColors.length]} transition-all`}
                      style={{ width: `${chapterTargetTotal > 0 ? (Math.max(0, ch.target) / chapterTargetTotal) * 100 : 0}%` }}
                      title={`${chapterLabel(ch.num)} · ${ch.target}%`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {chapters.map((ch, i) => (
                    <span key={ch.id} className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-[11px] text-slate-500">
                      <span className={`h-2 w-2 rounded-full ${chapterColors[i % chapterColors.length]}`} />
                      <span className="truncate">{chapterLabel(ch.num)} · {ch.target}%</span>
                    </span>
                  ))}
                  <span className={`ml-auto text-[11px] font-semibold ${chapterTargetTotal === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    Total {chapterTargetTotal}%
                  </span>
                </div>
                {chapters.map((ch, i) => (
                  <div key={ch.id} className="grid grid-cols-[minmax(0,1fr)_86px_28px] items-end gap-3 p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                    <select
                      value={ch.num}
                      onChange={(e) => {
                        const newCh = [...chapters];
                        newCh[i].num = Number(e.target.value);
                        setChapters(newCh);
                      }}
                      className="flex-1 h-8 px-2 text-[13px] bg-white border border-slate-200 rounded-md outline-none"
                    >
                      {chapterOptions.map(c => (
                        <option key={c.num} value={c.num}>{chapterLabel(c.num)}</option>
                      ))}
                    </select>
                    <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Target %
                      <input 
                        type="number" 
                        min="0"
                        max="100"
                        step="5"
                        value={ch.target}
                        onChange={(e) => {
                          const newCh = [...chapters];
                          newCh[i].target = Number(e.target.value);
                          setChapters(newCh);
                        }}
                        className="h-8 w-full px-2 text-center text-[13px] font-semibold text-brand-accent bg-white border border-slate-200 rounded-md outline-none focus:border-brand-accent"
                      />
                    </label>
                    <button 
                      onClick={() => setChapters(chapters.filter((_, idx) => idx !== i))}
                      className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Parameters */}
        <section className="bg-white border border-border-subtle rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-[13px] font-semibold text-brand-primary uppercase tracking-wider">Parameters</h2>
          </div>
          <div className="p-6">
            <span className="block text-[12px] font-medium text-slate-700 mb-3">Difficulty Weights</span>
            <div className="grid grid-cols-3 gap-3 mb-8">
              <label className="flex flex-col gap-1.5 text-[12px] font-medium text-slate-600">
                Easy
                <input type="number" value={easyPct} onChange={e=>setEasyPct(Number(e.target.value))} className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-emerald-600 font-bold outline-none focus:border-emerald-400" />
              </label>
              <label className="flex flex-col gap-1.5 text-[12px] font-medium text-slate-600">
                Medium
                <input type="number" value={mediumPct} onChange={e=>setMediumPct(Number(e.target.value))} className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-amber-600 font-bold outline-none focus:border-amber-400" />
              </label>
              <label className="flex flex-col gap-1.5 text-[12px] font-medium text-slate-600">
                Hard
                <input type="number" value={hardPct} onChange={e=>setHardPct(Number(e.target.value))} className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-rose-600 font-bold outline-none focus:border-rose-400" />
              </label>
            </div>

            <span className="block text-[12px] font-medium text-slate-700 mb-3">Allowed Question Types</span>
            <div className="flex flex-wrap gap-2 mb-6">
              {Array.from(new Set(bank.questions.map(q => q.questionType))).sort().map(type => (
                <label key={type} className="inline-flex items-center gap-1.5 text-[12px] text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200 cursor-pointer hover:bg-slate-100">
                  <input 
                    type="checkbox" 
                    checked={selectedTypes.includes(type)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedTypes([...selectedTypes, type]);
                      else setSelectedTypes(selectedTypes.filter(t => t !== type));
                    }}
                    className="accent-brand-accent"
                  />
                  {type}
                </label>
              ))}
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer text-[12px] font-medium text-slate-600">
              <input type="checkbox" checked={demoMode} onChange={e => setDemoMode(e.target.checked)} className="accent-brand-accent" />
              Demo export
            </label>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <button 
                onClick={handleGenerate} 
                disabled={!hasQuestions}
                className="w-full py-2.5 bg-brand-accent text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Paper
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Right Column: Preview */}
      <div className="flex flex-col gap-6">
        <section className="bg-white border border-border-subtle rounded-2xl shadow-sm p-6 min-h-[600px] flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-slate-100 gap-2">
            <h2 className="text-base font-semibold text-brand-primary">Preview Paper</h2>
            {selectedQuestions.length > 0 && (
              <span className="text-[12px] font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                Microtest {testNumber} — {currentMarks}/{totalMarks} marks selected
              </span>
            )}
          </div>
          
          {selectedQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center mt-12">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 border border-blue-100 shadow-sm">
                <span className="text-2xl">📝</span>
              </div>
              <h3 className="text-slate-800 font-semibold mb-1">No paper generated yet</h3>
              <p className="text-[13px] text-slate-500 max-w-xs leading-relaxed">
                Configure your blueprint on the left and click Generate Paper to start building your microtest.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 flex-1">
              {selectedQuestions.map((q, i) => {
                const isLocked = lockedIds.has(q.id);
                const diffColor = q.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                  : q.difficulty === 'Hard' ? 'bg-rose-50 text-rose-600 border-rose-100' 
                  : 'bg-amber-50 text-amber-600 border-amber-100';

                return (
                  <article key={q.id} className={`group relative flex gap-4 p-4 transition-colors ${isLocked ? 'bg-brand-accent/5 border-l-2 border-brand-accent' : 'border-b border-slate-100 hover:bg-slate-50/50'}`}>
                    <div className="flex flex-col items-center gap-2 w-8 shrink-0 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 tracking-wider">Q{i + 1}</span>
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{q.id}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[11px] font-medium text-slate-500">{q.marks} mark{q.marks === 1 ? '' : 's'}</span>
                        <span className="text-slate-300">•</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${diffColor}`}>{q.difficulty}</span>
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-200/60 text-[10px] font-medium">Ch {q.chapterNumber}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/60 text-[10px] font-medium">{q.questionType}</span>
                        {q.topic && (
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200/60 text-[10px] font-medium">{q.topic}</span>
                        )}
                      </div>

                      <div className="text-sm text-slate-800 leading-snug mb-2" dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(q.question) }} />
                      
                      {q.imageUrl && (
                        <div className="my-2">
                          <img src={q.imageUrl} alt="diagram" className="max-h-48 rounded object-contain border border-slate-200" />
                        </div>
                      )}

                      {q.options && (
                        <div className="text-[13px] text-slate-600 leading-relaxed bg-white/60 rounded-md p-3 border border-slate-100">
                          A. <span dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(q.options.A) }} /><br/>
                          B. <span dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(q.options.B) }} /><br/>
                          C. <span dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(q.options.C) }} /><br/>
                          D. <span dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(q.options.D) }} />
                        </div>
                      )}

                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                        <button
                          onClick={() => openTopicModal(q.id)}
                          disabled={!q.topic}
                          className="px-3 py-1.5 rounded-md bg-blue-50/60 text-blue-600 border border-blue-100 text-[11px] font-medium hover:bg-blue-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          More from Topic
                        </button>
                        <div className="flex flex-wrap items-center gap-1.5 justify-end">
                          <button onClick={() => handleSwap(q.id)} className="px-2.5 py-1 text-[11px] font-medium rounded transition-colors bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100">Swap</button>
                          <button onClick={() => handleLock(q.id)} className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${isLocked ? 'bg-brand-accent/20 text-brand-accent hover:bg-brand-accent/30' : 'bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}>
                            {isLocked ? 'Unlock' : 'Lock'}
                          </button>
                          <button onClick={() => handleRemove(q.id)} className="px-2.5 py-1 text-[11px] font-medium rounded transition-colors bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50">Remove</button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {selectedQuestions.length > 0 && (
            <div className="flex items-center gap-3 pt-6 mt-auto border-t border-slate-100">
              <button onClick={handleExport} disabled={exporting} className="px-5 py-2.5 bg-brand-primary text-white text-[13px] font-semibold rounded-lg shadow-sm hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-wait">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                {exporting ? 'Preparing Word File...' : 'Export Word File'}
              </button>
            </div>
          )}
        </section>
      </div>

      {topicModal && sourceTopicQuestion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setTopicModal(null)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-brand-primary">More From Topic</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                  Found questions matching <span className="font-semibold text-brand-accent">{sourceTopicQuestion.topic}</span>. Choose a type, then swap the current question or add a new one below it.
                </p>
              </div>
              <button onClick={() => setTopicModal(null)} className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">x</button>
            </div>

            <div className="p-5">
              {topicTypes.length === 0 ? (
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-5 text-center text-[12px] text-slate-500">
                  No additional questions are available for this topic.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {topicTypes.map(type => {
                    const selected = topicModal.selectedType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setTopicModal({ ...topicModal, selectedType: type })}
                        className={`rounded-lg border p-3 text-left transition-colors ${selected ? 'border-brand-accent bg-blue-50/60 ring-1 ring-brand-accent' : 'border-slate-200 hover:border-brand-accent/60'}`}
                      >
                        <div className="text-[13px] font-semibold text-slate-800">{type}</div>
                        <div className="mt-0.5 text-[11px] font-medium text-slate-500">{topicTypeCounts[type]} available</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4">
              <button
                onClick={handleTopicSwap}
                disabled={!topicModal.selectedType || lockedIds.has(topicModal.sourceId)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Swap Current
              </button>
              <button
                onClick={handleTopicAdd}
                disabled={!topicModal.selectedType}
                className="rounded-lg bg-brand-accent px-3 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add as New
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
