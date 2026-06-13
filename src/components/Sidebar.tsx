import { Link, useLocation } from 'react-router-dom';
import { NAV } from '../lib/data';
import { useTeacher } from './TeacherContext';
import { useEffect, useState } from 'react';
import { getTeacherClasses } from '../lib/gateway';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { teacher, setTeacherId } = useTeacher();
  const [myClasses, setMyClasses] = useState<string[]>([]);

  useEffect(() => {
    if (teacher) {
      getTeacherClasses(teacher.teacher_id).then(setMyClasses).catch(() => setMyClasses([]));
    }
  }, [teacher?.teacher_id]);

  return (
    <aside className="w-64 border-r border-border-subtle bg-surface-card flex flex-col h-full shrink-0">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="size-8 bg-brand-accent rounded-md flex items-center justify-center text-white font-bold">
            S
          </div>
          <div className="leading-tight">
            <div className="font-bold tracking-tight text-lg">SAH Command</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
              Haldwani · Uttarakhand
            </div>
          </div>
        </div>

        <nav className="space-y-1">
          {NAV.map((item) => {
            const path = item.key === 'today' ? '/' : `/${item.key}`;
            const active = location.pathname === path;
            
            return (
              <Link
                key={item.key}
                to={path}
                onClick={onNavigate}
                className={
                  active
                    ? "flex items-center gap-3 px-3 py-2 bg-brand-accent/5 text-brand-accent rounded-lg font-medium text-sm"
                    : "flex items-center gap-3 px-3 py-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors text-sm"
                }
              >
                <span
                  className={
                    active
                      ? "size-1.5 rounded-full bg-brand-accent"
                      : "size-1.5 rounded-full bg-transparent"
                  }
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8">
          <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            My Classes
          </div>
          <div className="space-y-1 text-sm">
            {myClasses.map((c) => (
              <a
                key={c}
                href="#"
                className="block px-3 py-1.5 text-slate-500 hover:text-brand-primary hover:bg-slate-50 rounded-md transition-colors"
              >
                {c}
              </a>
            ))}
            {myClasses.length === 0 && (
              <p className="px-3 py-1.5 text-xs text-slate-400 italic">No classes assigned</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto p-6">
        <div className="p-4 bg-slate-50 rounded-xl border border-border-subtle">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Active Session
          </p>
          {teacher ? (
            <>
              <p className="text-sm font-bold">{teacher.teacher_name}</p>
              <p className="text-xs text-slate-500">{teacher.email}</p>
            </>
          ) : (
            <p className="text-sm text-slate-400 italic">No teacher selected</p>
          )}
          <button 
            onClick={() => setTeacherId('')}
            className="mt-2 text-[11px] text-brand-accent hover:underline font-medium"
          >
            Switch Teacher
          </button>
        </div>
      </div>
    </aside>
  );
}
