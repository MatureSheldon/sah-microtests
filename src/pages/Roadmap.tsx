import { useState, useMemo } from 'react';
import { ChapterInput, allocatePeriods, calculateAvailablePeriods } from '../lib/scheduling';
import { MOCK_TIMETABLE, MOCK_EVENTS } from '../lib/data';

const INITIAL_CHAPTERS: ChapterInput[] = [
  { no: '01', title: 'Number Systems', priority: 3 },
  { no: '02', title: 'Polynomials', priority: 3 },
  { no: '03', title: 'Coordinate Geometry', priority: 2 },
  { no: '04', title: 'Linear Equations', priority: 3 },
  { no: '05', title: 'Introduction to Euclid', priority: 1 },
  { no: '06', title: 'Lines and Angles', priority: 5 },
  { no: '07', title: 'Triangles', priority: 5 },
];

export function YearlyRoadmap() {
  // State for Settings Panel
  const [targetClass, setTargetClass] = useState('10-B');
  const [targetSubject, setTargetSubject] = useState('Mathematics');
  const [termStart] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [termEnd, setTermEnd] = useState('2025-02-28'); // default target date
  
  const [chapters, setChapters] = useState<ChapterInput[]>(INITIAL_CHAPTERS);

  // Auto-calculate available periods from the timetable
  const totalAvailablePeriods = useMemo(() => {
    return calculateAvailablePeriods(
      MOCK_TIMETABLE,
      MOCK_EVENTS,
      new Date(termStart),
      new Date(termEnd),
      targetClass,
      targetClass.split('-')[1] || '',
      targetSubject
    );
  }, [termStart, termEnd, targetClass, targetSubject]);

  // Auto-allocate periods based on available total and priorities
  const allocations = useMemo(() => {
    if (totalAvailablePeriods <= 0) return chapters.map(ch => ({ ...ch, allocatedPeriods: 0 }));
    return allocatePeriods(chapters, totalAvailablePeriods, 0.10); // 10% buffer
  }, [chapters, totalAvailablePeriods]);

  const updatePriority = (idx: number, priority: number) => {
    const newChapters = [...chapters];
    newChapters[idx].priority = priority;
    setChapters(newChapters);
  };

  // Prevent unreasonably low dates (e.g., must be at least 1 month from now)
  const minDate = useMemo(() => {
    const d = new Date(termStart);
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  }, [termStart]);

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Yearly Teaching Roadmap</h1>
        <p className="text-slate-500">Configure your target completion date and let the engine auto-allocate your periods.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              Plan Settings
            </h2>
            
            <div className="space-y-4">
              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-slate-700">
                Class / Section
                <select 
                  value={targetClass} 
                  onChange={(e) => setTargetClass(e.target.value)}
                  className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none"
                >
                  <option value="10-B">Class 10-B</option>
                  <option value="9-C">Class 9-C</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-slate-700">
                Subject
                <select 
                  value={targetSubject} 
                  onChange={(e) => setTargetSubject(e.target.value)}
                  className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none"
                >
                  <option value="Mathematics">Mathematics</option>
                  <option value="Science">Science</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-slate-700">
                Target Completion Date
                <input 
                  type="date"
                  min={minDate}
                  value={termEnd}
                  onChange={(e) => setTermEnd(e.target.value)}
                  className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none font-mono text-sm"
                />
                <span className="text-[11px] text-slate-400">Must be at least 1 month from today.</span>
              </label>
            </div>

            <div className="mt-8 p-4 bg-brand-accent/5 rounded-xl border border-brand-accent/20 flex flex-col items-center justify-center">
              <span className="text-[11px] font-bold text-brand-accent uppercase tracking-widest mb-1">Available Periods</span>
              <span className="text-4xl font-black text-brand-primary tracking-tight">
                {totalAvailablePeriods}
              </span>
              <span className="text-[10px] text-slate-400 mt-2 text-center">
                Calculated from timetable, minus holidays & exams. 10% buffer reserved.
              </span>
            </div>
          </div>

          <div className="p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-100 text-sm leading-relaxed shadow-sm">
            <strong className="text-blue-900 block mb-1 uppercase tracking-wider text-[11px]">Guideline for Priorities (1-5)</strong>
            Set the priority keeping in mind the <span className="font-semibold underline decoration-blue-300 underline-offset-2">difficulty</span>, <span className="font-semibold underline decoration-blue-300 underline-offset-2">length</span>, and <span className="font-semibold underline decoration-blue-300 underline-offset-2">importance</span> of the chapter.
            <br/><br/>
            A priority of <strong>5</strong> heavily increases allocated periods, while <strong>1</strong> decreases it.
          </div>
        </div>

        {/* Allocation Table */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-[13px] font-semibold text-slate-900 uppercase tracking-wider">Chapter Allocation</h2>
              <span className="text-[11px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded">
                Live Sync Active
              </span>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b border-border-subtle text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-semibold">Chapter</th>
                  <th className="px-6 py-3 font-semibold text-center">Teacher Priority (1-5)</th>
                  <th className="px-6 py-3 font-semibold text-right">Allocated Periods</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allocations.map((ch, idx) => (
                  <tr key={ch.no} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold text-xs group-hover:bg-brand-accent/10 group-hover:text-brand-accent transition-colors">
                          {ch.no}
                        </span>
                        <span className="font-semibold text-brand-primary">{ch.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={ch.priority}
                          onChange={(e) => updatePriority(idx, Number(e.target.value))}
                          className="w-24 accent-brand-accent cursor-pointer"
                        />
                        <span className="font-bold w-4 text-center text-brand-primary bg-white border border-slate-200 rounded text-xs py-0.5 shadow-sm">
                          {ch.priority}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md font-bold shadow-sm">
                        {ch.allocatedPeriods}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalAvailablePeriods <= 0 && (
              <div className="p-12 text-center text-slate-400">
                No teaching periods found for this class between the selected dates.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
