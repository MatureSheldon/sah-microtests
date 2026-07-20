import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTeacher } from './TeacherContext';
import { getTeachingLoad } from '../lib/gateway';

/* ─── Quick Links Card (replaces old AdminCard) ──────────────────────────── */

export function QuickLinksCard() {
  const links = [
    { to: '/chapters', icon: '📚', label: 'Library', desc: 'Concepts & Plans' },
    { to: '/microtests', icon: '📝', label: 'Microtest', desc: 'Build & Export' },
    { to: '/timetable', icon: '📅', label: 'Timetable', desc: 'Full Week View' },
  ];

  return (
    <div className="p-5 sm:p-6 bg-slate-900 text-white rounded-2xl relative overflow-hidden">
      <div className="relative z-10">
        <h3 className="text-base font-bold mb-4">Quick Access</h3>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/15 active:scale-95 transition-all text-center"
            >
              <span className="text-xl sm:text-2xl">{link.icon}</span>
              <div>
                <p className="text-xs sm:text-sm font-semibold">{link.label}</p>
                <p className="text-[10px] text-slate-400 hidden sm:block">{link.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <div className="absolute -bottom-10 -right-10 size-40 bg-brand-accent/20 rounded-full blur-3xl" />
    </div>
  );
}

/* ─── Teaching Load Card ─────────────────────────────────────────────────── */

export function LoadCard() {
  const { teacher } = useTeacher();
  const [loadDays, setLoadDays] = useState<{ day: string; periods: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (teacher) {
      setLoading(true);
      getTeachingLoad(teacher.teacher_id)
        .then(setLoadDays)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [teacher?.teacher_id]);

  if (!teacher) return null;

  const maxPeriods = Math.max(1, ...loadDays.map(ld => ld.periods));
  const peakDay = loadDays.find(ld => ld.periods === maxPeriods)?.day || '';

  return (
    <div className="p-5 sm:p-6 border border-border-subtle bg-white rounded-2xl">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-bold">Weekly Load</h3>
          <p className="text-xs text-slate-500">Periods per day</p>
        </div>
        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded uppercase tracking-wider">
          {maxPeriods > 6 ? 'Heavy' : 'Balanced'}
        </span>
      </div>
      <div className="space-y-4">
        {loading ? (
          <div className="h-28 pt-4 flex items-center justify-center text-sm text-slate-400">Loading...</div>
        ) : (
          <>
            <div className="flex items-end gap-2 sm:gap-3 h-28 pt-4">
              {loadDays.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                  <div
                    className={
                      d.periods === maxPeriods
                        ? "w-full bg-brand-accent rounded-t-md"
                        : "w-full bg-slate-100 rounded-t-md"
                    }
                    style={{ height: `${(d.periods / maxPeriods) * 100}%` }}
                    title={`${d.periods} periods`}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 sm:gap-3">
              {loadDays.map((d) => (
                <span
                  key={d.day}
                  className="flex-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                >
                  {d.day}
                </span>
              ))}
            </div>
            {maxPeriods >= 6 && (
              <p className="text-xs text-slate-500 mt-3 leading-relaxed italic border-l-2 border-brand-accent/30 pl-3">
                Peak load on {peakDay} ({maxPeriods} periods). Ensure lesson plans are pre-synced.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
