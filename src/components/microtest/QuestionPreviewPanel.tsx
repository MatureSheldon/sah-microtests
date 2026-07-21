import React from 'react';
import { Markdown } from '../Markdown';
import { Question } from '../../lib/bank';
import { MermaidDiagram } from '../MermaidDiagram';
import { GeoJsonMap } from '../GeoJsonMap';

interface Props {
  state: any;
  filtering: any;
}

export function QuestionPreviewPanel({ state, filtering }: Props) {
  const {
    testNumber, totalMarks,
    selectedQuestions, setSelectedQuestions,
    lockedIds, setLockedIds,
    topicModal, setTopicModal,
    exporting, handleExport,
    handleSwap, handleLock, handleRemove
  } = state;

  const { activeQuestions } = filtering;

  const currentMarks = selectedQuestions.reduce((s: number, q: Question) => s + q.marks, 0);

  const sourceTopicQuestion = topicModal ? selectedQuestions.find((q: Question) => q.id === topicModal.sourceId) : null;
  const topicPool = sourceTopicQuestion
    ? activeQuestions.filter((q: Question) =>
      q.useInPapers === 'Yes' &&
      q.id !== sourceTopicQuestion.id &&
      q.topic === sourceTopicQuestion.topic &&
      !selectedQuestions.some((selected: Question) => selected.id === q.id)
    )
    : [];
  const topicTypeCounts = topicPool.reduce<Record<string, number>>((counts: any, q: Question) => {
    counts[q.questionType] = (counts[q.questionType] || 0) + 1;
    return counts;
  }, {});
  const topicTypes = Object.keys(topicTypeCounts).sort();

  const openTopicModal = (sourceId: string) => {
    const source = selectedQuestions.find((q: Question) => q.id === sourceId);
    if (!source) return;
    const used = new Set(selectedQuestions.map((q: Question) => q.id));
    const sameTopicPool = activeQuestions.filter((q: Question) =>
      q.useInPapers === 'Yes' &&
      q.id !== source.id &&
      q.topic === source.topic &&
      !used.has(q.id)
    );
    const types = Array.from(new Set(sameTopicPool.map((q: Question) => q.questionType))).sort();
    setTopicModal({
      sourceId,
      selectedType: types.includes(source.questionType) ? source.questionType : (types[0] as string || null)
    });
  };

  const topicReplacement = () => {
    if (!topicModal || !sourceTopicQuestion || !topicModal.selectedType) return null;
    const candidates = topicPool.filter((q: Question) => q.questionType === topicModal.selectedType);
    return candidates.find((q: Question) => q.difficulty === sourceTopicQuestion.difficulty && q.marks === sourceTopicQuestion.marks) ||
      candidates.find((q: Question) => q.marks === sourceTopicQuestion.marks) ||
      candidates[0] ||
      null;
  };

  const handleTopicSwap = () => {
    if (!topicModal || lockedIds.has(topicModal.sourceId)) return;
    const replacement = topicReplacement();
    if (!replacement) return;
    setSelectedQuestions(selectedQuestions.map((q: Question) => q.id === topicModal.sourceId ? replacement : q));
    setTopicModal(null);
  };

  const handleTopicAdd = () => {
    if (!topicModal) return;
    const addition = topicReplacement();
    if (!addition) return;
    const sourceIndex = selectedQuestions.findIndex((q: Question) => q.id === topicModal.sourceId);
    const nextQuestions = [...selectedQuestions];
    if (sourceIndex >= 0) nextQuestions.splice(sourceIndex + 1, 0, addition);
    else nextQuestions.push(addition);
    setSelectedQuestions(nextQuestions);
    setTopicModal(null);
  };

  return (
    <>
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
            {selectedQuestions.map((q: Question, i: number) => {
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

                    <Markdown text={q.question} className="text-sm text-slate-800 leading-snug mb-2" />
                    
                    {(q.assetData || q.imageUrl) && (() => {
                      const assetFormat = String(q.assetFormat || '').trim().toLowerCase();
                      const assetData = String(q.assetData || '').trim();
                      const visual = assetData || String(q.imageUrl || '').trim();
                      return (
                        <div className="mt-3">
                          {assetFormat === 'geojson' ? (
                            <GeoJsonMap data={visual} title={`Question ${i + 1} map`} />
                          ) : visual.startsWith('<svg') ? (
                            <div
                              className="max-h-72 max-w-full rounded-lg border flex items-center justify-center p-4 bg-white [&>svg]:max-h-64 [&>svg]:w-auto"
                              dangerouslySetInnerHTML={{ __html: visual }}
                            />
                          ) : assetFormat === 'mermaid' || visual.match(/^(flowchart|graph|pie|sequenceDiagram|stateDiagram|classDiagram|erDiagram|gantt|journey|gitGraph|mindmap|timeline)/i) ? (
                            <div className="rounded-lg border bg-white p-4">
                              <MermaidDiagram chart={visual} />
                            </div>
                          ) : (
                            <img
                              src={visual}
                              alt={`Question ${i + 1} diagram`}
                              className="max-h-72 max-w-full rounded-lg border object-contain"
                              onError={(e) => {
                                console.error("Image failed to load", q.id, visual);
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          )}
                          <div className="mt-1 text-xs text-slate-500 truncate">
                            {assetFormat === 'geojson' ? 'GeoJSON Map' : visual.startsWith('<svg') ? 'Raw SVG Image' :
                             assetFormat === 'mermaid' || visual.match(/^(flowchart|graph|pie|sequenceDiagram)/i) ? 'Mermaid Diagram' : `Image: ${visual}`}
                          </div>
                        </div>
                      );
                    })()}

                    {q.options && (
                      <div className="text-[13px] text-slate-600 leading-relaxed bg-white/60 rounded-md p-3 border border-slate-100">
                        A. <Markdown text={q.options.A} as="span" /><br/>
                        B. <Markdown text={q.options.B} as="span" /><br/>
                        C. <Markdown text={q.options.C} as="span" /><br/>
                        D. <Markdown text={q.options.D} as="span" />
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
                  {topicTypes.map((type: string) => {
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
    </>
  );
}
