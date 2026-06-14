import React from 'react';

interface Props {
  state: any;
  filtering: any;
}

export function ChapterWeightPanel({ state, filtering }: Props) {
  const { klass, subject, chapters, setChapters } = state;
  const { hasQuestions, datasetOptions, chapterOptions, availableChapters } = filtering;

  const chapterTargetTotal = chapters.reduce((sum: number, chapter: any) => sum + Math.max(0, Number(chapter.target) || 0), 0);
  const chapterColors = ['bg-brand-accent', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500', 'bg-cyan-500'];
  const chapterLabel = (num: number) => {
    const option = chapterOptions.find((chapter: any) => chapter.num === num);
    return option?.name ? `Ch ${num}: ${option.name}` : `Chapter ${num}`;
  };

  const handleAddChapter = () => {
    const used = new Set(chapters.map((chapter: any) => chapter.num));
    const nextChapter = availableChapters.find((chapter: any) => !used.has(chapter)) || availableChapters[0] || 1;
    if (!chapters.length) {
      setChapters([{ id: Math.random().toString(), num: nextChapter, target: 100 }]);
      return;
    }

    const newTarget = 10;
    const largestIndex = chapters.reduce((bestIndex: number, chapter: any, index: number) =>
      chapter.target > chapters[bestIndex].target ? index : bestIndex
    , 0);
    const rebalanced = chapters.map((chapter: any, index: number) => index === largestIndex
      ? { ...chapter, target: Math.max(0, chapter.target - newTarget) }
      : chapter
    );
    setChapters([...rebalanced, { id: Math.random().toString(), num: nextChapter, target: newTarget }]);
  };

  return (
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
            No questions available for Class {klass} {subject}. Connected bank currently has: {datasetOptions.map((d: any) => `Class ${d.classLevel} ${d.subject}`).join(', ') || 'no usable datasets'}.
          </p>
        ) : (
          <div className="flex flex-col gap-3 mb-4">
            <div className="overflow-hidden rounded-full bg-slate-100 border border-slate-200 h-3 flex">
              {chapters.map((ch: any, i: number) => (
                <div
                  key={ch.id}
                  className={`${chapterColors[i % chapterColors.length]} transition-all`}
                  style={{ width: `${chapterTargetTotal > 0 ? (Math.max(0, ch.target) / chapterTargetTotal) * 100 : 0}%` }}
                  title={`${chapterLabel(ch.num)} · ${ch.target}%`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {chapters.map((ch: any, i: number) => (
                <span key={ch.id} className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-[11px] text-slate-500">
                  <span className={`h-2 w-2 rounded-full ${chapterColors[i % chapterColors.length]}`} />
                  <span className="truncate">{chapterLabel(ch.num)} · {ch.target}%</span>
                </span>
              ))}
              <span className={`ml-auto text-[11px] font-semibold ${chapterTargetTotal === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                Total {chapterTargetTotal}%
              </span>
            </div>
            {chapters.map((ch: any, i: number) => (
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
                  {chapterOptions.map((c: any) => (
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
                  onClick={() => setChapters(chapters.filter((_: any, idx: number) => idx !== i))}
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
  );
}
