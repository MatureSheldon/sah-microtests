import { Link } from 'react-router-dom';
import type { DashboardPeriod } from '../lib/models';
import { useState } from 'react';
import { MarkDoneDialog } from './MarkDoneDialog';
import { HomeworkViewer } from './HomeworkViewer';

export function ActivePeriodCard({ period }: { period: DashboardPeriod }) {
  const [markDoneOpen, setMarkDoneOpen] = useState(false);
  const [homeworkOpen, setHomeworkOpen] = useState(false);
  const r = period.resources;

  return (
    <>
      <div className="p-6 bg-white border-2 border-brand-accent rounded-2xl shadow-sm relative overflow-hidden h-full">
        <div className="absolute top-0 right-0 p-4">
          <span className="flex h-2 w-2 rounded-full bg-brand-accent animate-pulse" />
        </div>
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-bold px-2 py-1 bg-brand-accent text-white rounded">
              PERIOD {period.slot.period_no}
            </span>
            <span className="text-sm text-slate-500">
              {period.slot.start_time} — {period.slot.end_time}
            </span>
            {!period.is_content_available && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded">
                Preview Only
              </span>
            )}
          </div>
          <h3 className="text-2xl font-bold mb-1">
            {period.class_label}-{period.section_label}: {period.subject_name}
          </h3>
          <p className="text-slate-500 mb-6">
            {period.chapter_title ? `Ch: ${period.chapter_title}` : 'No chapter assigned'} •{" "}
            <span className="text-brand-accent font-medium">Topic: {period.topic_title || 'TBD'}</span>
          </p>

          <div className="grid grid-cols-4 gap-2 mt-auto">
            <ResourceTile 
              label="Plan" 
              cta={r.has_lesson_plan ? 'Review PDF' : 'Not available'}
              disabled={!r.has_lesson_plan}
            />
            <ResourceTile 
              label="Concept" 
              cta={r.has_concept_map ? 'Open Map' : 'Not available'}
              disabled={!r.has_concept_map}
            />
            <ResourceTile 
              label="Homework" 
              cta={r.has_homework ? 'View Set' : 'Not available'}
              disabled={!r.has_homework}
              onClick={() => setHomeworkOpen(true)}
            />
            <ResourceTile 
              label="Test" 
              cta={r.has_microtest ? 'Microtest' : 'Not available'}
              disabled={!r.has_microtest}
              to={r.has_microtest 
                ? `/microtests?class=${encodeURIComponent(r.microtest_class || '')}&subject=${encodeURIComponent(r.microtest_subject || '')}&chapter=${encodeURIComponent(r.microtest_chapter || '')}&topic=${encodeURIComponent(r.microtest_topic || '')}`
                : undefined
              }
            />
          </div>

          <div className="flex gap-2 mt-4">
            <button 
              onClick={() => setMarkDoneOpen(true)}
              className="flex-1 py-2 bg-brand-primary text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
            >
              Mark Done
            </button>
            <button 
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                r.has_smart_board 
                  ? 'bg-slate-50 border border-border-subtle text-brand-primary hover:bg-slate-100'
                  : 'bg-slate-50 border border-border-subtle text-slate-400 cursor-not-allowed'
              }`}
              disabled={!r.has_smart_board}
              onClick={() => r.has_smart_board && alert("Smart Board integration coming soon!")}
            >
              {r.has_smart_board ? 'Open Smart Board' : 'Smart Board N/A'}
            </button>
          </div>
        </div>
      </div>

      {markDoneOpen && (
        <MarkDoneDialog 
          period={period} 
          onClose={() => setMarkDoneOpen(false)} 
        />
      )}

      {homeworkOpen && (
        <HomeworkViewer 
          period={period} 
          onClose={() => setHomeworkOpen(false)} 
        />
      )}
    </>
  );
}

function ResourceTile({ label, cta, to, disabled, onClick }: { label: string; cta: string; to?: string; disabled?: boolean; onClick?: () => void }) {
  const content = (
    <>
      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{label}</p>
      <span className={`text-xs font-semibold ${disabled ? 'text-slate-400' : 'text-brand-accent'}`}>{cta}</span>
    </>
  );
  
  const className = `block w-full p-3 rounded-lg text-center border transition-colors ${
    disabled 
      ? 'bg-slate-50/50 border-slate-100 cursor-not-allowed opacity-60' 
      : 'bg-slate-50 border-border-subtle hover:border-brand-accent'
  }`;

  if (to && !disabled) {
    return <Link to={to} className={className}>{content}</Link>;
  }
  return <button className={className} disabled={disabled} onClick={onClick}>{content}</button>;
}

export function UpcomingPeriodCard({ period }: { period: DashboardPeriod }) {
  return (
    <div className="p-6 bg-white border border-border-subtle rounded-2xl shadow-sm hover:border-slate-300 transition-colors flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded">
          PERIOD {period.slot.period_no}
        </span>
        <span className="text-sm text-slate-400">{period.slot.start_time}</span>
        {!period.is_content_available && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded">
            Preview
          </span>
        )}
      </div>
      <h3 className="text-lg font-bold mb-1">{period.class_label}-{period.section_label}</h3>
      <p className="text-sm text-slate-500 mb-4">
        {period.subject_name}: {period.topic_title || 'TBD'}
      </p>
      {period.pacing === 'behind' && (
        <span className="self-start text-[10px] font-bold px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded uppercase tracking-wider mb-3">
          Behind Schedule
        </span>
      )}
      <div className="mt-auto pt-4 border-t border-slate-50">
        <div className="w-full aspect-[2/1] bg-gradient-to-br from-blue-50 via-slate-50 to-emerald-50 rounded-lg grid place-items-center relative overflow-hidden">
          <svg viewBox="0 0 200 100" className="w-full h-full opacity-60">
            <circle cx="40" cy="50" r="14" fill="#2563eb" />
            <circle cx="100" cy="30" r="10" fill="#10b981" />
            <circle cx="160" cy="60" r="12" fill="#f59e0b" />
            <line x1="40" y1="50" x2="100" y2="30" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="100" y1="30" x2="160" y2="60" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="40" y1="50" x2="160" y2="60" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
          </svg>
          <span className="absolute bottom-1 right-2 text-[8px] font-bold uppercase tracking-widest text-slate-400">
            Concept Map
          </span>
        </div>
      </div>
    </div>
  );
}

export function DimPeriodCard({ period }: { period: DashboardPeriod }) {
  return (
    <div className="p-6 bg-white border border-border-subtle rounded-2xl shadow-sm opacity-70 hover:opacity-100 transition-all flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded">
          PERIOD {period.slot.period_no}
        </span>
        <span className="text-sm text-slate-400">{period.slot.start_time}</span>
      </div>
      <h3 className="text-lg font-bold mb-1">{period.class_label}-{period.section_label}</h3>
      <p className="text-sm text-slate-500 mb-4">
        {period.subject_name}: {period.topic_title || 'TBD'}
      </p>
      <div className="space-y-2 text-xs text-slate-500">
        <div className="flex justify-between">
          <span>Chapter</span>
          <span className="font-medium text-brand-primary">{period.chapter_title || 'TBD'}</span>
        </div>
        <div className="flex justify-between">
          <span>Content</span>
          <span className={`font-medium ${period.is_content_available ? 'text-brand-accent' : 'text-slate-400'}`}>
            {period.is_content_available ? 'Available ✓' : 'Not available yet'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Pacing</span>
          <span className={`font-medium ${period.pacing === 'behind' ? 'text-rose-600' : period.pacing === 'ahead' ? 'text-emerald-600' : 'text-brand-primary'}`}>
            {period.pacing === 'behind' ? 'Behind' : period.pacing === 'ahead' ? 'Ahead' : 'On Track'}
          </span>
        </div>
      </div>
    </div>
  );
}
