import { Link } from 'react-router-dom';
import { Period } from '../lib/data';

export function ActivePeriodCard({ period }: { period: Period }) {
  return (
    <div className="p-6 bg-white border-2 border-brand-accent rounded-2xl shadow-sm relative overflow-hidden h-full">
      <div className="absolute top-0 right-0 p-4">
        <span className="flex h-2 w-2 rounded-full bg-brand-accent animate-pulse" />
      </div>
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-bold px-2 py-1 bg-brand-accent text-white rounded">
            PERIOD {period.no}
          </span>
          <span className="text-sm text-slate-500">
            {period.start} — {period.end}
          </span>
        </div>
        <h3 className="text-2xl font-bold mb-1">
          {period.klass}: {period.subject}
        </h3>
        <p className="text-slate-500 mb-6">
          {period.chapter} •{" "}
          <span className="text-brand-accent font-medium">Topic: {period.topic}</span>
        </p>

        <div className="grid grid-cols-4 gap-2 mt-auto">
          <ResourceTile label="Plan" cta="Review PDF" />
          <ResourceTile label="Concept" cta="Open Map" />
          <ResourceTile label="Homework" cta="Ex. 4.3" />
          <ResourceTile 
            label="Test" 
            cta="Microtest" 
            to={`/microtests?class=${encodeURIComponent(period.klass.split(' ')[1]?.split('-')[0] || '')}&subject=${encodeURIComponent(period.subject)}&chapter=${encodeURIComponent(period.chapter)}`} 
          />
        </div>

        <div className="flex gap-2 mt-4">
          <button className="flex-1 py-2 bg-brand-primary text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors">
            Mark Done
          </button>
          <button 
            className="flex-1 py-2 bg-slate-50 border border-border-subtle text-brand-primary text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors"
            onClick={() => alert("Smart Board integration coming soon!")}
          >
            Open Smart Board
          </button>
        </div>
      </div>
    </div>
  );
}

function ResourceTile({ label, cta, to }: { label: string; cta: string; to?: string }) {
  const content = (
    <>
      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{label}</p>
      <span className="text-xs font-semibold text-brand-accent">{cta}</span>
    </>
  );
  
  const className = "block w-full p-3 bg-slate-50 rounded-lg text-center border border-border-subtle hover:border-brand-accent transition-colors";

  if (to) {
    return <Link to={to} className={className}>{content}</Link>;
  }
  return <button className={className}>{content}</button>;
}

export function UpcomingPeriodCard({ period }: { period: Period }) {
  return (
    <div className="p-6 bg-white border border-border-subtle rounded-2xl shadow-sm hover:border-slate-300 transition-colors flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded">
          PERIOD {period.no}
        </span>
        <span className="text-sm text-slate-400">{period.start}</span>
      </div>
      <h3 className="text-lg font-bold mb-1">{period.klass}</h3>
      <p className="text-sm text-slate-500 mb-4">
        {period.subject}: {period.topic}
      </p>
      {period.status === "behind" && (
        <span className="self-start text-[10px] font-bold px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded uppercase tracking-wider mb-3">
          Behind · -3 days
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

export function DimPeriodCard({ period }: { period: Period }) {
  if (!period) return null;
  return (
    <div className="p-6 bg-white border border-border-subtle rounded-2xl shadow-sm opacity-70 hover:opacity-100 transition-all flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded">
          PERIOD {period.no}
        </span>
        <span className="text-sm text-slate-400">{period.start}</span>
      </div>
      <h3 className="text-lg font-bold mb-1">{period.klass}</h3>
      <p className="text-sm text-slate-500 mb-4">
        {period.subject}: {period.topic}
      </p>
      <div className="space-y-2 text-xs text-slate-500">
        <div className="flex justify-between">
          <span>Chapter</span>
          <span className="font-medium text-brand-primary">{period.chapter}</span>
        </div>
        <div className="flex justify-between">
          <span>Materials</span>
          <span className="font-medium text-brand-accent">Pre-loaded ✓</span>
        </div>
        <div className="flex justify-between">
          <span>Last taught</span>
          <span className="font-medium text-brand-primary">2 days ago</span>
        </div>
      </div>
    </div>
  );
}
