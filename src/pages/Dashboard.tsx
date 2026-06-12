import { PERIODS, ROADMAP } from '../lib/data';
import { ActivePeriodCard, UpcomingPeriodCard, DimPeriodCard } from '../components/PeriodCards';
import { TimelineChip } from '../components/TimelineChip';
import { ChapterNode } from '../components/ChapterNode';
import { AdminCard, LoadCard } from '../components/DashboardWidgets';

export function Dashboard() {
  return (
    <>
      <TodaySection />
      <RoadmapSection />
      <BottomGrid />
    </>
  );
}

import { useState } from 'react';

function TodaySection() {
  const teaching = PERIODS.filter((p) => p.state !== "break");
  const done = teaching.filter((p) => p.state === "done").length;
  
  // By default, expand the active period (or the first one if none is active)
  const defaultActive = PERIODS.find((p) => p.state === "active")?.no || PERIODS[0]?.no;
  const [expandedPeriodNo, setExpandedPeriodNo] = useState<number>(defaultActive);

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Today's Periods</h2>
          <p className="text-sm text-slate-500">
            {done} of {teaching.length} completed · Class 10-B starting now
          </p>
        </div>
        <button className="text-sm font-semibold text-brand-accent hover:underline">
          View Full Timetable →
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {teaching.map((p) => {
          const isExpanded = p.no === expandedPeriodNo;
          
          if (isExpanded) {
            return (
              <div key={p.no} className="lg:col-span-2 cursor-pointer transition-all h-full" onClick={() => setExpandedPeriodNo(p.no)}>
                <ActivePeriodCard period={p} />
              </div>
            );
          }
          
          if (p.state === "done" || p.state === "later") {
            return (
              <div key={p.no} className="cursor-pointer transition-all hover:scale-[1.02] h-full" onClick={() => setExpandedPeriodNo(p.no)}>
                <DimPeriodCard period={p} />
              </div>
            );
          }
          
          return (
            <div key={p.no} className="cursor-pointer transition-all hover:scale-[1.02] h-full" onClick={() => setExpandedPeriodNo(p.no)}>
              <UpcomingPeriodCard period={p} />
            </div>
          );
        })}
      </div>

      {/* Timeline strip of all periods */}
      <div className="bg-white border border-border-subtle rounded-2xl p-4 mt-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {PERIODS.map((p, idx) => (
            <TimelineChip key={idx} period={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RoadmapSection() {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Yearly Teaching Roadmap</h2>
          <p className="text-sm text-slate-500">
            Class 10-B Mathematics · CBSE 2024-25 · Term 2 Focus
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-border-subtle rounded-lg text-sm font-medium hover:bg-slate-50">
            Adjust Priorities
          </button>
          <button className="px-4 py-2 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-blue-600">
            Print Syllabus
          </button>
        </div>
      </div>

      <div className="bg-white border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 flex items-start gap-6 overflow-x-auto">
          {ROADMAP.map((ch) => (
            <ChapterNode key={ch.no} chapter={ch} />
          ))}

          {/* Holiday marker inserted between chapters 4 and 5 */}
          <div className="flex-shrink-0 w-32 flex flex-col items-center justify-center border-l border-dashed border-slate-300 ml-2 self-stretch">
            <div className="p-2 bg-amber-50 text-amber-800 rounded text-center border border-amber-100">
              <p className="text-[10px] font-black uppercase mb-1">Diwali Break</p>
              <p className="text-xs font-medium">Oct 31 – Nov 4</p>
            </div>
          </div>

          <div className="flex-shrink-0 w-32 flex flex-col items-center justify-center border-l border-dashed border-slate-300 self-stretch">
            <div className="p-2 bg-rose-50 text-rose-700 rounded text-center border border-rose-100">
              <p className="text-[10px] font-black uppercase mb-1">Mid-Term Exam</p>
              <p className="text-xs font-medium">Dec 9 – Dec 18</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BottomGrid() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <AdminCard />
      <LoadCard />
    </section>
  );
}
