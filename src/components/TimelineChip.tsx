import { Period } from '../lib/data';

export function TimelineChip({ period }: { period: Period }) {
  if (period.state === "break") {
    return (
      <div className="shrink-0 flex flex-col items-center px-3 py-2 border border-dashed border-slate-300 rounded-lg text-slate-400">
        <span className="text-[9px] font-bold uppercase tracking-widest">{period.topic}</span>
        <span className="text-[10px] font-mono">
          {period.start}–{period.end}
        </span>
      </div>
    );
  }

  const base =
    "shrink-0 px-3 py-2 rounded-lg border text-left min-w-[160px] transition-colors";
  const tone =
    period.state === "active"
      ? "bg-brand-accent text-white border-brand-accent"
      : period.state === "done"
      ? "bg-slate-50 border-border-subtle text-slate-400"
      : period.state === "next"
      ? "bg-amber-50 border-amber-200 text-amber-900"
      : "bg-white border-border-subtle text-brand-primary";

  return (
    <div className={`${base} ${tone}`}>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">
          P{period.no} · {period.start}
        </span>
        {period.state === "active" && (
          <span className="size-1.5 rounded-full bg-white animate-pulse" />
        )}
      </div>
      <div className="text-xs font-bold leading-tight">{period.klass}</div>
      <div className="text-[10px] opacity-80 leading-tight truncate">{period.subject}</div>
    </div>
  );
}
