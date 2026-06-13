import { useState, useEffect } from 'react';
import { getHomework } from '../lib/gateway';
import type { DashboardPeriod, HomeworkSet, HomeworkItem } from '../lib/models';
import { renderMarkdownToHtml } from '../lib/utils';

export function HomeworkViewer({ period, onClose }: { period: DashboardPeriod; onClose: () => void }) {
  const [data, setData] = useState<{ set: HomeworkSet; items: HomeworkItem[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!period.resources.has_homework) {
      setLoading(false);
      return;
    }
    
    getHomework(period.slot.class_id, period.slot.subject_id, period.topic_id)
      .then(res => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  const handleAssign = () => {
    alert("Homework assigned to " + period.class_label + "-" + period.section_label);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/60 backdrop-blur-sm sm:p-4">
      <div className="w-full h-full sm:w-[600px] sm:max-h-full sm:rounded-2xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Homework Set</h2>
            <p className="text-sm text-slate-500">{period.subject_name}: {period.topic_title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 rounded-lg p-2 hover:bg-slate-200 transition-colors">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-24 bg-slate-100 rounded-xl"></div>
              <div className="h-24 bg-slate-100 rounded-xl"></div>
            </div>
          ) : !data ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl border border-slate-100">
                📚
              </div>
              <h3 className="text-slate-800 font-semibold mb-1">Homework not available</h3>
              <p className="text-sm text-slate-500">No homework set has been curated for this topic yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-semibold border border-blue-100">
                  {data.set.total_questions} Questions
                </div>
                <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-semibold border border-emerald-100">
                  ~{data.set.estimated_minutes} Minutes
                </div>
              </div>
              
              <div className="space-y-4">
                {data.items.map((item, idx) => (
                  <div key={item.homework_item_id} className="p-4 rounded-xl border border-slate-200 bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-slate-400">Q{idx + 1}</span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {item.marks} mark{item.marks !== 1 ? 's' : ''} • {item.difficulty}
                      </span>
                    </div>
                    <div className="text-sm text-slate-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(item.question_text) }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {data && (
          <div className="p-4 border-t border-slate-100 bg-white shrink-0">
            <button 
              onClick={handleAssign}
              className="w-full py-3 bg-brand-primary text-white font-semibold rounded-xl hover:bg-slate-800 shadow-sm transition-colors"
            >
              Assign to Class {period.class_label}-{period.section_label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
