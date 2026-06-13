/* ═══════════════════════════════════════════════════════════════════════════
 *  Teacher Selector — Full-screen overlay shown when no teacher is selected.
 * ═══════════════════════════════════════════════════════════════════════════ */

import { useTeacher } from './TeacherContext';

export function TeacherSelector() {
  const { teacher, teachers, loading, setTeacherId } = useTeacher();

  // Don't show if teacher is already selected or still loading
  if (loading || teacher) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="px-6 py-8 text-center bg-gradient-to-br from-slate-50 to-blue-50/50 border-b border-slate-100">
          <div className="mx-auto mb-4 w-14 h-14 bg-brand-accent rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-200">
            S
          </div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            SAH Command Center
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Select your profile to continue
          </p>
        </div>

        {/* Teacher list */}
        <div className="p-4 max-h-[50vh] overflow-y-auto">
          <div className="space-y-2">
            {teachers.map((t) => (
              <button
                key={t.teacher_id}
                onClick={() => setTeacherId(t.teacher_id)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-brand-accent hover:bg-blue-50/50 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-brand-accent/10 flex items-center justify-center text-sm font-bold text-slate-600 group-hover:text-brand-accent shrink-0 transition-colors">
                  {t.short_name}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-slate-800 group-hover:text-brand-accent transition-colors">
                    {t.teacher_name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {t.email}
                  </div>
                </div>
                <svg className="w-4 h-4 text-slate-300 group-hover:text-brand-accent ml-auto shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 text-center">
            Scholars Academic Home · Haldwani, Uttarakhand
          </p>
        </div>
      </div>
    </div>
  );
}
