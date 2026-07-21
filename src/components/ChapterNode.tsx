export type ChapterState = 'done' | 'active' | 'upcoming';
export interface Chapter {
  no: string;
  title: string;
  state: ChapterState;
  meta: string;
  progress: number;
  priority?: boolean;
}
export function ChapterNode({ chapter }: { chapter: Chapter }) {
  const isDone = chapter.state === "done";
  const isActive = chapter.state === "active";

  return (
    <div className="flex-shrink-0 w-64">
      <div className="flex items-center gap-3 mb-4">
        <div
          className={
            isActive
              ? "size-10 rounded-full bg-brand-accent text-white flex items-center justify-center font-bold shadow-lg shadow-brand-accent/20"
              : isDone
              ? "size-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100"
              : "size-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center font-bold border border-border-subtle"
          }
        >
          {chapter.no}
        </div>
        <div className="h-px flex-1 bg-slate-100" />
      </div>
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <h4
          className={
            isActive ? "font-bold text-sm text-brand-accent" : "font-bold text-sm"
          }
        >
          {chapter.title}
        </h4>
        {chapter.priority && (
          <span className="text-[9px] px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-sm font-bold">
            PRIORITY
          </span>
        )}
      </div>
      <p
        className={
          isActive
            ? "text-xs text-brand-accent mb-3 uppercase tracking-wider font-bold"
            : isDone
            ? "text-xs text-emerald-600 mb-3 uppercase tracking-wider font-bold"
            : "text-xs text-slate-400 mb-3 uppercase tracking-wider font-bold"
        }
      >
        {chapter.meta}
      </p>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className={
            isDone
              ? "h-full bg-emerald-500"
              : isActive
              ? "h-full bg-brand-accent"
              : "h-full bg-slate-200"
          }
          style={{ width: `${Math.max(chapter.progress, 4)}%` }}
        />
      </div>
    </div>
  );
}
