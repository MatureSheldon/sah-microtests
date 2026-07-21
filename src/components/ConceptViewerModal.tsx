import { useState, useEffect } from 'react';
import { getChapterConcepts, getHomework } from '../lib/gateway';
import type { Concept, HomeworkSet, HomeworkItem } from '../lib/models';
import { Markdown } from './Markdown';
import { MermaidDiagram } from './MermaidDiagram';
import { GeoJsonMap } from './GeoJsonMap';

interface Props {
  classId: string;
  subjectId: string;
  chapterId: string;
  chapterTitle: string;
  onClose: () => void;
}

function decodeSvgMarkup(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function isGeoJsonVisual(visualType: string | undefined) {
  return String(visualType || '').trim().toLowerCase() === 'geojson';
}

function isSvgVisual(visualType: string | undefined, visualData: string | undefined) {
  const type = String(visualType || '').trim().toLowerCase();
  const data = String(visualData || '').trim();
  return type === 'svg' || data.startsWith('<svg') || data.startsWith('&lt;svg');
}

function TopicHomework({ classId, subjectId, topicId }: { classId: string, subjectId: string, topicId: string }) {
  const [data, setData] = useState<{ set: HomeworkSet; items: HomeworkItem[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHomework(classId, subjectId, topicId)
      .then(res => {
        if (res && res.items) {
          res.items = res.items.filter(i => String(i.topic_id || '').trim() === String(topicId).trim());
          if (res.items.length > 0 && res.set) {
            res.set.total_questions = res.items.length;
            res.set.estimated_minutes = Math.ceil(res.items.length * 3.5);
          }
        }
        setData(res);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [classId, subjectId, topicId]);

  if (loading) {
    return (
      <div className="mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-6 lg:p-8 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 rounded mb-4"></div>
        <div className="h-20 bg-slate-200 rounded"></div>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="mt-8 bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center">
        <span className="text-2xl mb-2 opacity-50">📭</span>
        <h4 className="text-sm font-bold text-slate-700 mb-1">Homework not available</h4>
        <p className="text-xs text-slate-500">There are no practice questions assigned for this topic in the curriculum yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 lg:p-8 shadow-sm">
      <div className="flex items-center justify-between border-b border-indigo-200/50 pb-4 mb-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <span className="text-indigo-500">📝</span> Suggested Homework
        </h3>
        <div className="flex gap-3">
          <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            {data.set.total_questions} Qs
          </div>
          <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            ~{data.set.estimated_minutes} Min
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {data.items.map((item, idx) => (
          <div key={item.homework_item_id} className="p-5 rounded-xl border border-indigo-100/60 bg-white shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-bold text-slate-400">Q{idx + 1}</span>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/80">
                {item.marks} mark{item.marks !== 1 ? 's' : ''} • {item.difficulty}
              </span>
            </div>
            <Markdown text={item.question_text} className="text-sm text-slate-700 leading-relaxed font-medium" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConceptViewerModal({ classId, subjectId, chapterId, chapterTitle, onClose }: Props) {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadConcepts() {
      try {
        setLoading(true);
        setError(null);
        const data = await getChapterConcepts(classId, subjectId, chapterId);
        setConcepts(data);
        if (data.length === 0) {
          setError("No concepts found for this chapter.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown network error');
      } finally {
        setLoading(false);
      }
    }
    loadConcepts();
  }, [classId, subjectId, chapterId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6 lg:p-12 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-slate-50 w-full h-full sm:h-auto sm:max-h-full max-w-[1200px] rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-white px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold px-2 py-0.5 bg-brand-accent/10 text-brand-accent rounded uppercase tracking-wider">
                {classId.replace('CLASS_', '')} • {subjectId}
              </span>
              <span className="text-[10px] font-mono text-slate-400">{chapterId}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800">{chapterTitle}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 scroll-smooth">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-10 h-10 border-4 border-brand-accent border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-slate-500 font-medium">Loading Concepts...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
               <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">⚠️</div>
               <h3 className="text-lg font-bold text-slate-800 mb-2">Could not load concepts</h3>
               <p className="text-slate-500 max-w-md">{error}</p>
            </div>
          ) : concepts.length > 0 ? (
            <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12 animate-in slide-in-from-bottom-8 duration-500 pb-12">
              
              {/* Concept Index (Table of Contents) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-10">
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">
                  📚 Chapter Concepts
                </h3>
                <ol className="list-decimal list-inside space-y-2">
                  {concepts.map((concept, idx) => (
                    <li key={concept.id} className="text-slate-600 font-medium">
                      <a 
                        href={`#concept-${idx}`}
                        className="hover:text-brand-accent hover:underline transition-colors cursor-pointer flex items-center gap-2"
                      >
                        {concept.title}
                        {concept.struggle_status === 'active' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded border border-rose-200">
                            ⚠️ Class Struggled
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Render all concepts sequentially */}
              {concepts.map((concept, idx) => (
                <div key={concept.id} id={`concept-${idx}`} className="space-y-8 pt-6 border-t-4 border-slate-200/50 mt-12 first:border-0 first:mt-0 first:pt-0">
                  
                  <div className="mb-6">
                    <span className="text-sm font-bold text-brand-accent tracking-widest uppercase mb-2 block">
                      Concept {idx + 1}
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 tracking-tight leading-tight">
                        {concept.title}
                      </h1>
                      {concept.struggle_status === 'active' && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-semibold text-sm shadow-sm animate-pulse">
                          <span>⚠️</span> Students found this difficult
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 lg:p-8">
                    <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                      <span className="text-blue-500">📖</span> Explanation
                    </h3>
                    <Markdown text={concept.explanation} />
                  </div>

                  {/* Visual Map */}
                  {concept.visual_data && (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 lg:p-8">
                      <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                        <span className="text-emerald-500">🗺️</span> Visual Map
                      </h3>
                      <div className="w-full flex items-center justify-center overflow-x-auto min-h-[300px]">
                        {String(concept.visual_type || '').trim().toLowerCase() === 'mermaid' ? (
                          <MermaidDiagram chart={concept.visual_data} />
                        ) : isGeoJsonVisual(concept.visual_type) ? (
                          <GeoJsonMap data={concept.visual_data} title={concept.title} />
                        ) : isSvgVisual(concept.visual_type, concept.visual_data) ? (
                          <div
                            className="w-full max-w-[760px] rounded-lg bg-white [&>svg]:block [&>svg]:w-full [&>svg]:h-auto"
                            dangerouslySetInnerHTML={{ __html: decodeSvgMarkup(String(concept.visual_data || '').trim()) }}
                          />
                        ) : (
                          <img src={concept.visual_data} alt={concept.title} className="max-w-full h-auto rounded-lg" />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Formulas & Misconceptions */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {concept.key_formulas && concept.key_formulas.length > 0 && (
                      <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-2xl p-6 lg:p-8">
                        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-brand-accent/10 pb-2">
                          <span className="text-brand-accent">🧮</span> Key Formulas & Relations
                        </h3>
                        <div className="space-y-3">
                          {concept.key_formulas.map((formula, fIdx) => (
                            <div 
                              key={fIdx} 
                              className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm text-sm text-slate-700 leading-relaxed"
                            >
                              <Markdown text={formula} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {concept.misconceptions && concept.misconceptions.length > 0 && (
                      <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 lg:p-8">
                        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-rose-200/50 pb-2">
                          <span className="text-rose-500">⚠️</span> Common Misconceptions
                        </h3>
                        <ul className="space-y-3">
                          {concept.misconceptions.map((misc, mIdx) => (
                            <li key={mIdx} className="flex gap-3 text-sm text-slate-700 bg-white p-4 rounded-xl border border-rose-100/50 shadow-sm leading-relaxed">
                              <span className="text-rose-400 shrink-0 mt-0.5">⊗</span>
                              <Markdown text={misc} as="span" />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Embedded Homework for this Concept's Topic */}
                  {concept.topic_id && (
                    <TopicHomework 
                      classId={classId} 
                      subjectId={subjectId} 
                      topicId={concept.topic_id} 
                    />
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
