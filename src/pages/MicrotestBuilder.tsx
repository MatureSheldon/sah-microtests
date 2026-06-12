import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { BankData, fetchQuestionBank, Question } from '../lib/bank';
import { generatePaper, replaceQuestion } from '../lib/generator';
import { renderMarkdownToHtml } from '../lib/utils';

export function MicrotestBuilder() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialClass = searchParams.get('class') || '9';
  const initialSubject = searchParams.get('subject') || 'Mathematics';
  const initialChapter = searchParams.get('chapter') || '';

  const [bank, setBank] = useState<BankData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Document Profile State
  const [klass, setKlass] = useState(initialClass);
  const [subject, setSubject] = useState(initialSubject);
  const [testNumber, setTestNumber] = useState(1);
  const [totalMarks, setTotalMarks] = useState(20);
  const [duration, setDuration] = useState(30);

  // Blueprint State
  const [chapters, setChapters] = useState<{ id: string; num: number; target: number }[]>([
    { id: 'c1', num: parseInt(initialChapter) || 1, target: 100 }
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
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchQuestionBank().then((data) => {
      setBank(data);
      const types = Array.from(new Set(data.questions.map(q => q.questionType)));
      setSelectedTypes(types);
      setLoading(false);
    }).catch((err) => {
      console.error(err);
      setError(err.message || String(err));
      setLoading(false);
    });
  }, []);

  const availableClasses = (bank?.product ? bank.product.classes : bank ? Array.from(new Set(bank.questions.map(q => q.classLevel))).sort() : []) || [];
  const availableSubjects = (bank?.product && bank.product.subjectsByClass[klass] 
    ? bank.product.subjectsByClass[klass] 
    : bank ? Array.from(new Set(bank.questions.filter(q => q.classLevel === klass).map(q => q.subject))).sort() : []) || [];
  
  const availableChapters = (bank ? Array.from(new Set(bank.questions.filter(q => q.classLevel === klass && q.subject === subject).map(q => q.chapterNumber))).sort((a,b)=>a-b) : []) || [];
  const hasQuestions = availableChapters.length > 0;

  // Auto-reset chapters if the selected class/subject has no matching chapters currently selected
  useEffect(() => {
    if (availableChapters.length > 0) {
      setChapters(prev => prev.map(ch => availableChapters.includes(ch.num) ? ch : { ...ch, num: availableChapters[0] }));
    } else {
      setChapters([]);
    }
  }, [klass, subject, availableChapters.join(',')]);

  if (loading) {
    return (
      <div className="max-w-[1600px] w-full grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-8 items-start animate-pulse">
        <div className="flex flex-col gap-6">
          <div className="h-[250px] bg-white border border-slate-100 rounded-2xl shadow-sm p-6" />
          <div className="h-[200px] bg-white border border-slate-100 rounded-2xl shadow-sm p-6" />
          <div className="h-[300px] bg-white border border-slate-100 rounded-2xl shadow-sm p-6" />
        </div>
        <div className="h-[800px] bg-white border border-slate-100 rounded-2xl shadow-sm p-6 flex flex-col gap-4">
          <div className="h-10 bg-slate-100 rounded w-1/3 mb-8" />
          <div className="h-32 bg-slate-50 rounded-lg" />
          <div className="h-32 bg-slate-50 rounded-lg" />
          <div className="h-32 bg-slate-50 rounded-lg" />
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
    const pool = bank.questions.filter(q => q.classLevel === klass && q.subject === subject);
    const result = generatePaper(pool, blueprint, lockedIds, selectedQuestions);
    setSelectedQuestions(result);
  };

  const handleSwap = (id: string) => {
    const pool = bank.questions.filter(q => q.classLevel === klass && q.subject === subject);
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

  const currentMarks = selectedQuestions.reduce((s, q) => s + q.marks, 0);

  return (
    <div className="max-w-[1600px] w-full grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-8 items-start">
      {/* Left Column: Builder */}
      <div className="flex flex-col gap-6">
        
        {/* Document Profile */}
        <section className="bg-white border border-border-subtle rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h2 className="text-[13px] font-semibold text-brand-primary uppercase tracking-wider">Document Profile</h2>
            <span className="text-[11px] text-slate-500 font-medium">Bank Synced ✓</span>
          </div>
          <div className="p-6">
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
                  onChange={e => setSubject(e.target.value)}
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
              onClick={() => setChapters([...chapters, { id: Math.random().toString(), num: availableChapters[0] || 1, target: 10 }])}
              className="px-2 py-1 text-[11px] font-semibold text-brand-accent bg-brand-accent/10 rounded hover:bg-brand-accent/20 transition-colors disabled:opacity-50"
              disabled={!hasQuestions}
            >
              + Add
            </button>
          </div>
          <div className="p-6">
            {!hasQuestions ? (
              <p className="text-[12px] text-slate-500 italic py-2 text-center bg-slate-50 rounded-lg">
                No questions available for Class {klass} {subject} in the local fallback bank.
              </p>
            ) : (
              <div className="flex flex-col gap-3 mb-4">
                {chapters.map((ch, i) => (
                  <div key={ch.id} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                    <select
                      value={ch.num}
                      onChange={(e) => {
                        const newCh = [...chapters];
                        newCh[i].num = Number(e.target.value);
                        setChapters(newCh);
                      }}
                      className="flex-1 h-8 px-2 text-[13px] bg-white border border-slate-200 rounded-md outline-none"
                    >
                      {availableChapters.map(c => (
                        <option key={c} value={c}>Chapter {c}</option>
                      ))}
                    </select>
                    <span className="text-[11px] font-medium text-slate-500">Target %</span>
                    <input 
                      type="number" 
                      value={ch.target}
                      onChange={(e) => {
                        const newCh = [...chapters];
                        newCh[i].target = Number(e.target.value);
                        setChapters(newCh);
                      }}
                      className="w-16 h-8 px-2 text-center text-[13px] font-semibold text-brand-accent bg-white border border-slate-200 rounded-md outline-none"
                    />
                    <button 
                      onClick={() => setChapters(chapters.filter((_, idx) => idx !== i))}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"
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

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button onClick={() => handleSwap(q.id)} className="px-2.5 py-1 text-[11px] font-medium rounded transition-colors bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100">Swap</button>
                        <button onClick={() => handleLock(q.id)} className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${isLocked ? 'bg-brand-accent/20 text-brand-accent hover:bg-brand-accent/30' : 'bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}>
                          {isLocked ? 'Unlock' : 'Lock'}
                        </button>
                        <button onClick={() => handleRemove(q.id)} className="px-2.5 py-1 text-[11px] font-medium rounded transition-colors bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50">Remove</button>
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

    </div>
  );
}
