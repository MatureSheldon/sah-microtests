import { LOAD_DAYS } from '../lib/data';

export function AdminCard() {
  return (
    <div className="p-8 bg-slate-900 text-white rounded-3xl relative overflow-hidden">
      <div className="relative z-10">
        <h3 className="text-xl font-bold mb-2">Administrative Setup</h3>
        <p className="text-slate-400 text-sm mb-6">
          Configure your teaching environment for the upcoming academic week.
        </p>

        <div className="space-y-3">
          <AdminRow color="bg-amber-400" label="Upload Class Timetable (CSV)" meta="Last sync: 2d ago" />
          <AdminRow color="bg-brand-accent" label="Mark School Holidays" meta="Next: Oct 31" />
          <AdminRow color="bg-emerald-400" label="Set Exam Dates" meta="Mid-term in 12 days" />
          <AdminRow color="bg-rose-400" label="Set Chapter Priorities" meta="3 chapters flagged" />
        </div>
      </div>
      <div className="absolute -bottom-10 -right-10 size-48 bg-brand-accent/20 rounded-full blur-3xl" />
    </div>
  );
}

function AdminRow({ color, label, meta }: { color: string; label: string; meta: string }) {
  return (
    <button className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`size-2 rounded-full ${color}`} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-xs text-slate-400">{meta}</span>
    </button>
  );
}

export function LoadCard() {
  return (
    <div className="p-8 border border-border-subtle bg-white rounded-3xl">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold">Teaching Load Analysis</h3>
          <p className="text-sm text-slate-500">Periods per day this week</p>
        </div>
        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded uppercase tracking-wider">
          Balanced
        </span>
      </div>
      <div className="space-y-4">
        <div className="flex items-end gap-3 h-36 pt-4">
          {LOAD_DAYS.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
              <div
                className={
                  d.h === Math.max(...LOAD_DAYS.map(ld => ld.h))
                    ? "w-full bg-brand-accent rounded-t-md"
                    : "w-full bg-slate-100 rounded-t-md"
                }
                style={{ height: `${d.h}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          {LOAD_DAYS.map((d) => (
            <span
              key={d.day}
              className="flex-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest"
            >
              {d.day}
            </span>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-4 leading-relaxed italic border-l-2 border-brand-accent/30 pl-3">
          "Peak teaching load detected for Wednesday (7 periods). Ensure all lesson plans
          are pre-synced for offline use before Tuesday evening."
        </p>
      </div>
    </div>
  );
}
