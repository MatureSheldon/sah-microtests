import { useState, useEffect, useMemo } from 'react';
import { useTeacher } from '../components/TeacherContext';
import { getDashboard, getTeachingLoad } from '../lib/gateway';
import type { DashboardData, DashboardPeriod } from '../lib/models';
import { ActivePeriodCard, UpcomingPeriodCard, DimPeriodCard } from '../components/PeriodCards';
import { TimelineChip } from '../components/TimelineChip';
import { ChapterNode } from '../components/ChapterNode';
import { AdminCard, LoadCard } from '../components/DashboardWidgets';
import { Link } from 'react-router-dom';
import { ROADMAP } from '../lib/data';

export function Dashboard() {
  return (
    <>
      <TodaySection />
      <RoadmapSection />
      <BottomGrid />
    </>
  );
}

function TodaySection() {
  const { teacher } = useTeacher();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teacher) return;
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    getDashboard(teacher.teacher_id, today)
      .then(setDashboard)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [teacher?.teacher_id]);

  const periods = dashboard?.periods || [];
  const teaching = periods.filter((p) => p.slot.slot_type !== 'break');
  const done = teaching.filter((p) => p.progress_status === 'completed').length;
  const currentPeriod = teaching.find(p => p.progress_status === 'in_progress');
  
  const defaultActive = currentPeriod?.slot.period_no || teaching[0]?.slot.period_no;
  const [expandedPeriodNo, setExpandedPeriodNo] = useState<number | undefined>();

  // Set default expanded when data arrives
  useEffect(() => {
    if (defaultActive !== undefined && expandedPeriodNo === undefined) {
      setExpandedPeriodNo(defaultActive);
    }
  }, [defaultActive]);

  if (!teacher) {
    return (
      <section className="space-y-4">
        <div className="bg-white border border-border-subtle rounded-2xl p-8 text-center">
          <p className="text-slate-500 text-sm">Please select a teacher to view today's schedule.</p>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Today's Periods</h2>
            <p className="text-sm text-slate-500">Loading schedule...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 bg-white border border-slate-100 rounded-2xl shadow-sm animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Today's Periods</h2>
          <p className="text-sm text-slate-500">
            {done} of {teaching.length} completed
            {currentPeriod ? ` · ${currentPeriod.class_label}-${currentPeriod.section_label} ${currentPeriod.subject_name} now` : ''}
          </p>
        </div>
        <Link to="/timetable" className="text-sm font-semibold text-brand-accent hover:underline">
          View Full Timetable →
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {teaching.map((p) => {
          const isExpanded = p.slot.period_no === expandedPeriodNo;
          
          if (isExpanded) {
            return (
              <div key={p.slot.slot_id} className="lg:col-span-2 cursor-pointer transition-all h-full" onClick={() => setExpandedPeriodNo(p.slot.period_no)}>
                <ActivePeriodCard period={p} />
              </div>
            );
          }
          
          if (p.progress_status === 'completed') {
            return (
              <div key={p.slot.slot_id} className="cursor-pointer transition-all hover:scale-[1.02] h-full" onClick={() => setExpandedPeriodNo(p.slot.period_no)}>
                <DimPeriodCard period={p} />
              </div>
            );
          }
          
          return (
            <div key={p.slot.slot_id} className="cursor-pointer transition-all hover:scale-[1.02] h-full" onClick={() => setExpandedPeriodNo(p.slot.period_no)}>
              <UpcomingPeriodCard period={p} />
            </div>
          );
        })}
      </div>

      {/* Timeline strip of all periods */}
      <div className="bg-white border border-border-subtle rounded-2xl p-4 mt-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {periods.map((p) => (
            <TimelineChip key={p.slot.slot_id} period={p} />
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
