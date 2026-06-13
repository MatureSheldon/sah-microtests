import { useState, useEffect } from 'react';
import type { DashboardPeriod, PeriodContext } from '../lib/models';
import { getPeriodContext, markPeriodDone, clearGatewayCache } from '../lib/gateway';

export function MarkDoneDialog({ period, onClose }: { period: DashboardPeriod; onClose: () => void }) {
  const [context, setContext] = useState<PeriodContext | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [actionType, setActionType] = useState<'mark_done' | 'revision_only' | 'period_not_taught' | 'skipped'>('mark_done');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    getPeriodContext(period.slot.slot_id, today)
      .then(data => {
        setContext(data);
        if (data.progress.current_topic_id) {
          setSelectedTopicId(data.progress.current_topic_id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period.slot.slot_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!context) return;
    
    setSubmitting(true);
    const today = new Date().toISOString().split('T')[0];
    
    try {
      await markPeriodDone({
        slot_id: period.slot.slot_id,
        date: today,
        class_id: period.slot.class_id,
        section_id: period.slot.section_id,
        subject_id: period.slot.subject_id,
        teacher_id: period.slot.teacher_id,
        chapter_id: context.progress.current_chapter_id,
        topic_ids_completed: actionType === 'mark_done' ? [selectedTopicId] : [],
        action_type: actionType,
        notes
      });
      clearGatewayCache();
      // Optional: We could call a context/prop to force dashboard reload here
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to mark period as done.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Close Period {period.slot.period_no}</h2>
            <p className="text-sm text-slate-500">{period.class_label}-{period.section_label} {period.subject_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 rounded-lg p-2 hover:bg-slate-50 transition-colors">
            ✕
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 animate-pulse">Loading curriculum context...</div>
        ) : !context ? (
          <div className="p-8 text-center text-rose-500">Failed to load context.</div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
            {/* Topic Selection */}
            {context.planned_topics.length > 0 ? (
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700">Topic Coverage</label>
                <div className="space-y-2">
                  {context.planned_topics.map(t => (
                    <label key={t.topic_id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedTopicId === t.topic_id ? 'bg-blue-50/50 border-brand-accent' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                      <input 
                        type="radio" 
                        name="topic" 
                        value={t.topic_id} 
                        checked={selectedTopicId === t.topic_id}
                        onChange={() => setSelectedTopicId(t.topic_id)}
                        className="mt-1 flex-shrink-0 text-brand-accent"
                      />
                      <div>
                        <div className="text-sm font-medium text-slate-800">{t.topic_id}</div>
                        <div className="text-xs text-slate-500">Planned for week {t.planned_week}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-sm text-amber-800">
                No planned topics found for this subject.
              </div>
            )}

            {/* Action Type */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Period Action</label>
              <div className="grid grid-cols-2 gap-2">
                <ActionRadio value="mark_done" current={actionType} onChange={setActionType} label="Topic Taught" />
                <ActionRadio value="revision_only" current={actionType} onChange={setActionType} label="Revision Only" />
                <ActionRadio value="period_not_taught" current={actionType} onChange={setActionType} label="Not Taught (Substitute/Event)" />
                <ActionRadio value="skipped" current={actionType} onChange={setActionType} label="Skipped / Moved" />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Notes (Optional)</label>
              <textarea 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g., Students struggled with step 2, need to revise tomorrow."
                className="w-full rounded-lg border border-slate-200 p-3 text-sm min-h-[80px] focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button 
                type="button" 
                onClick={onClose}
                className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="flex-1 py-2.5 bg-brand-primary text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                disabled={submitting || (actionType === 'mark_done' && !selectedTopicId)}
              >
                {submitting ? 'Submitting...' : 'Confirm & Close Period'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ActionRadio({ 
  value, 
  current, 
  onChange, 
  label 
}: { 
  value: any, 
  current: string, 
  onChange: (v: any) => void, 
  label: string 
}) {
  const active = value === current;
  return (
    <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-sm font-medium transition-colors ${active ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
      <input 
        type="radio" 
        checked={active} 
        onChange={() => onChange(value)} 
        className="text-brand-primary focus:ring-brand-primary" 
      />
      {label}
    </label>
  );
}
