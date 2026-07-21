import { useState, useEffect } from 'react';
import { getHomework } from '../lib/gateway';
import type { HomeworkSet, HomeworkItem } from '../lib/models';
import { Markdown } from './Markdown';
import { GeoJsonMap } from './GeoJsonMap';
import { MermaidDiagram } from './MermaidDiagram';


function HomeworkAsset({ item }: { item: HomeworkItem }) {
  const format = String(item.asset_format || '').trim().toLowerCase();
  const data = String(item.asset_data || '').trim();
  if (!data) return null;

  if (format === 'geojson') {
    return <GeoJsonMap data={data} title="Homework map" className="mt-4" />;
  }

  if (format === 'mermaid' || data.match(/^(flowchart|graph|pie|sequenceDiagram|stateDiagram|classDiagram|erDiagram|gantt|journey|gitGraph|mindmap|timeline)/i)) {
    return <div className="mt-4"><MermaidDiagram chart={data} /></div>;
  }

  if (format === 'svg' || data.startsWith('<svg')) {
    return <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: data }} />;
  }

  return <img src={data} alt="Homework visual" className="mt-4 max-h-72 rounded-lg border border-slate-200 object-contain" />;
}

interface Props {
  classId: string;
  subjectId: string;
  topicId: string;
  topicTitle: string;
  onClose: () => void;
}

function HomeworkItemCard({ item, idx, showAnswers }: { item: HomeworkItem; idx: number; showAnswers: boolean }) {
  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-bold text-slate-400">Q{idx + 1}</span>
        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {item.marks} mark{item.marks !== 1 ? 's' : ''} • {item.difficulty}
        </span>
      </div>
      <Markdown text={item.question_text} className="text-sm text-slate-800 leading-relaxed font-medium" />
      <HomeworkAsset item={item} />
      {showAnswers && item.answer && (
        <div className="mt-4 p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <span className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase mb-1 block">Answer</span>
          <Markdown text={item.answer} className="text-sm text-emerald-900 leading-relaxed" />
          {item.explanation && (
            <div className="mt-3 pt-3 border-t border-emerald-200/50">
              <span className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase mb-1 block">Explanation</span>
              <Markdown text={item.explanation} className="text-sm text-emerald-800 leading-relaxed" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function HomeworkViewer({ classId, subjectId, topicId, topicTitle, onClose }: Props) {
  const [data, setData] = useState<{ set: HomeworkSet; items: HomeworkItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);
  const [showOtherTopics, setShowOtherTopics] = useState(false);

  useEffect(() => {
    getHomework(classId, subjectId, topicId)
      .then(res => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [classId, subjectId, topicId]);

  const handleAssign = () => {
    alert("Homework assignment dispatched!");
    onClose();
  };

  const currentTopicItems = data?.items.filter(i => String(i.topic_id || '').trim() === String(topicId || '').trim()) || [];
  const otherItems = data?.items.filter(i => String(i.topic_id || '').trim() !== String(topicId || '').trim()) || [];

  const otherItemsGrouped = otherItems.reduce((acc, item) => {
    const tId = String(item.topic_id || '').trim() || 'Unknown Topic';
    const tTitle = item.topic_title ? String(item.topic_title).trim() : tId;
    if (!acc[tTitle]) acc[tTitle] = [];
    acc[tTitle].push(item);
    return acc;
  }, {} as Record<string, HomeworkItem[]>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/60 backdrop-blur-sm sm:p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full h-full sm:w-[600px] sm:max-h-full sm:rounded-2xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Homework Set</h2>
            <p className="text-sm text-slate-500">{topicTitle}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 rounded-lg p-2 hover:bg-slate-200 transition-colors">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-24 bg-slate-100 rounded-xl"></div>
              <div className="h-24 bg-slate-100 rounded-xl"></div>
            </div>
          ) : !data || !data.set ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl border border-slate-100">
                📚
              </div>
              <h3 className="text-slate-800 font-semibold mb-1">Homework not available</h3>
              <p className="text-sm text-slate-500">No homework set has been curated for this chapter yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white sticky top-0 z-10 pb-2 border-b border-slate-100">
                <div className="flex gap-3">
                  <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-bold border border-indigo-100">
                    {currentTopicItems.length} Qs (This Topic)
                  </div>
                  <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-xs font-bold border border-emerald-100 hidden sm:block">
                    ~{Math.ceil(currentTopicItems.length * 3.5)} Min
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer hover:text-slate-800 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={showAnswers} 
                    onChange={e => setShowAnswers(e.target.checked)} 
                    className="rounded border-slate-300 text-brand-accent focus:ring-brand-accent cursor-pointer w-4 h-4"
                  />
                  Show Answers
                </label>
              </div>
              
              {currentTopicItems.length === 0 && (
                <div className="p-5 bg-amber-50 border border-amber-200/60 rounded-xl flex items-start gap-3">
                  <span className="text-amber-500 text-lg">💡</span>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900 mb-1">No questions for this specific topic</h4>
                    <p className="text-xs text-amber-700/80 leading-relaxed">
                      This topic might not have dedicated practice questions yet. You can expand the section below to explore other questions from this chapter.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {currentTopicItems.map((item, idx) => (
                  <HomeworkItemCard key={item.homework_item_id} item={item} idx={idx} showAnswers={showAnswers} />
                ))}
              </div>

              {otherItems.length > 0 && (
                <div className="mt-10 border-t-2 border-slate-100 pt-8 pb-4">
                  <button 
                    onClick={() => setShowOtherTopics(!showOtherTopics)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">📚</span>
                      <div className="text-left">
                        <h4 className="font-bold text-slate-700">Questions from other topics</h4>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{otherItems.length} questions available</p>
                      </div>
                    </div>
                    <span className="text-slate-400 group-hover:text-slate-600 transition-transform">
                      {showOtherTopics ? '▲' : '▼'}
                    </span>
                  </button>
                  
                  {showOtherTopics && (
                    <div className="mt-6 space-y-6 animate-in slide-in-from-top-4 fade-in duration-300">
                      {Object.entries(otherItemsGrouped).map(([tTitle, items]) => (
                        <details key={tTitle} className="group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm" open={false}>
                          <summary className="p-4 bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition-colors list-none flex justify-between items-center border-b border-transparent group-open:border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-700">{tTitle}</span>
                              {items.some(i => i.struggle_status === 'active') && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded border border-rose-200">
                                  ⚠️ Class Struggled
                                </span>
                              )}
                              <span className="text-xs font-medium px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full ml-1">{items.length} Qs</span>
                            </div>
                            <span className="text-slate-400 transition-transform group-open:-rotate-180">▼</span>
                          </summary>
                          <div className="p-4 space-y-4 bg-slate-50/30">
                            {items.map((item, idx) => (
                              <HomeworkItemCard key={item.homework_item_id} item={item} idx={idx} showAnswers={showAnswers} />
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {data && data.set && (
          <div className="p-4 border-t border-slate-100 bg-white shrink-0">
            <button 
              onClick={handleAssign}
              className="w-full py-3 bg-brand-primary text-white font-semibold rounded-xl hover:bg-slate-800 shadow-sm transition-colors"
            >
              Assign Homework
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
