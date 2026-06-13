import { useTeacher } from './TeacherContext';

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
}

function getWeekNumber(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
}

function getTerm(d: Date): string {
  const month = d.getMonth(); // 0-indexed
  // Term 1: Apr–Sep (months 3–8), Term 2: Oct–Mar (months 9–11, 0–2)
  return month >= 3 && month <= 8 ? 'Term 1' : 'Term 2';
}

export function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { teacher } = useTeacher();
  const now = new Date();
  const dateStr = formatDate(now);
  const weekNo = getWeekNumber(now);
  const term = getTerm(now);

  return (
    <header className="h-16 border-b border-border-subtle bg-surface-card/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <h1 className="text-lg font-semibold hidden sm:block">Mission Control</h1>
        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase tracking-wider">
          Live
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-brand-primary border border-border-subtle rounded-lg bg-white">
          <span className="size-1.5 rounded-full bg-emerald-500" /> Synced 2m ago
        </button>
        <div className="text-right mr-1">
          <p className="text-sm font-medium">{dateStr}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Week {weekNo} · {term}</p>
        </div>
        <div className="size-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 border border-border-subtle flex items-center justify-center text-sm font-semibold text-brand-accent">
          {teacher?.short_name || '?'}
        </div>
      </div>
    </header>
  );
}
