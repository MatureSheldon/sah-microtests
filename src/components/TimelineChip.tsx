import type { DashboardPeriod } from '../lib/models';

export function TimelineChip({ period }: { period: DashboardPeriod }) {
  if (period.slot.slot_type === "break") {
    return (
      <div className="shrink-0 flex flex-col items-center px-3 py-2 border border-dashed border-slate-300 rounded-lg text-slate-400">
        <span className="text-[9px] font-bold uppercase tracking-widest">{period.topic_title}</span>
        <span className="text-[10px] font-mono">
          {period.slot.start_time}–{period.slot.end_time}
        </span>
      </div>
    );
  }

  const base = "shrink-0 px-3 py-2 rounded-lg border text-left min-w-[160px] transition-colors";
  
  let tone = "bg-white border-border-subtle text-brand-primary";
  if (period.progress_status === "in_progress") {
    tone = "bg-brand-accent text-white border-brand-accent";
  } else if (period.progress_status === "completed") {
    tone = "bg-slate-50 border-border-subtle text-slate-400";
  } else if (period.slot.period_no === 1) { // Hacky 'next' style just for visual variety if needed, but not strictly true
    tone = "bg-amber-50 border-amber-200 text-amber-900";
  }

  return (
    <div className={`${base} ${tone}`}>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">
          P{period.slot.period_no} · {period.slot.start_time}
        </span>
        {period.progress_status === "in_progress" && (
          <span className="size-1.5 rounded-full bg-white animate-pulse" />
        )}
      </div>
      <div className="text-xs font-bold leading-tight">{period.class_label}-{period.section_label}</div>
      <div className="text-[10px] opacity-80 leading-tight truncate">{period.subject_name}</div>
    </div>
  );
}
