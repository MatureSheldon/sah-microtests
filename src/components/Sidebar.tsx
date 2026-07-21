import { Link, useLocation } from 'react-router-dom';
export interface NavItem {
  label: string;
  key: string;
}

export const NAV: NavItem[] = [
  { label: "Today's Schedule", key: 'today' },
  { label: 'Yearly Roadmap', key: 'year' },
  { label: 'Chapter Library', key: 'chapters' },
  { label: 'Full Timetable', key: 'timetable' },
  { label: 'Admin Console', key: 'admin' },
];
import { useTeacher } from './TeacherContext';
import { useEffect, useState } from 'react';
import { getTeacherAssignments } from '../lib/gateway';
import type { TeacherAssignment } from '../lib/models';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { teacher, setTeacherId } = useTeacher();
  const [myAssignments, setMyAssignments] = useState<TeacherAssignment[]>([]);

  useEffect(() => {
    if (teacher) {
      getTeacherAssignments(teacher.teacher_id)
        .then(setMyAssignments)
        .catch(() => setMyAssignments([]));
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
            {myAssignments.map((a) => {
              // Convert subject codes to friendly names if needed
              const subjectNames: Record<string, string> = { MATH: 'Math', SCI: 'Science', ENG: 'English', SST: 'Social Science' };
              const subjectLabel = subjectNames[a.subject_id] || a.subject_id;
              
              return (
                <Link
                  key={`${a.class_id}_${a.subject_id}`}
                  to={`/chapters?class=${a.class_id}&subject=${a.subject_id}`}
                  onClick={onNavigate}
                  className="block px-3 py-1.5 text-slate-500 hover:text-brand-primary hover:bg-slate-50 rounded-md transition-colors"
                >
                  Class {a.class_label} · {subjectLabel}
                </Link>
              );
            })}
            {myAssignments.length === 0 && (
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
