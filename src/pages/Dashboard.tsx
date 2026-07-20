import { useState, useEffect } from 'react';
import { useTeacher } from '../components/TeacherContext';
import { getDashboard, getTeacherActionItems, resolveTopicStruggle } from '../lib/gateway';
import type { DashboardData, DashboardPeriod, ActionItem } from '../lib/models';
import { ActivePeriodCard, UpcomingPeriodCard, DimPeriodCard } from '../components/PeriodCards';
import { TimelineChip } from '../components/TimelineChip';
import { QuickLinksCard, LoadCard } from '../components/DashboardWidgets';

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function firstName(fullName: string): string {
  // "Mrs. Anjali Bisht" → "Anjali", "Anjali" → "Anjali"
  const parts = fullName.split(' ').filter(Boolean);
  if (parts.length <= 1) return fullName;
  // Skip honorifics
  const honorifics = ['mr.', 'mrs.', 'ms.', 'dr.', 'prof.', 'shri', 'smt.'];
  const first = parts.find(p => !honorifics.includes(p.toLowerCase()));
  return first || parts[1] || fullName;
}

/* ─── Main Dashboard ─────────────────────────────────────────────────────── */

export function Dashboard() {
  return (
    <>
      <TodaySection />
      <BottomGrid />
    </>
  );
}

/* ─── Today Section ──────────────────────────────────────────────────────── */

function TodaySection() {
  const { teacher } = useTeacher();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    if (!teacher) return;
    if (!dashboard) setLoading(true); // Only hard load on first mount
    setError(null);
    const now = new Date();
    // Format as YYYY-MM-DD in local time
    const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    Promise.all([
      getDashboard(teacher.teacher_id, today),
      getTeacherActionItems(teacher.teacher_id)
    ])
      .then(([dashData, items]) => {
        setDashboard(dashData);
        setActionItems(items);
      })
      .catch(err => {
        console.error(err);
        setError(err.message || 'Failed to fetch dashboard data');
      })
      .finally(() => setLoading(false));
  }, [teacher?.teacher_id, refreshCounter]);

  const periods = dashboard?.periods || [];
  const teaching = periods.filter((p) => p.slot.slot_type !== 'break');
  const done = teaching.filter((p) => p.progress_status === 'completed').length;
  const allDone = teaching.length > 0 && done === teaching.length;
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
        <GreetingHeader teacherName={teacher.teacher_name} periodCount={null} doneCount={0} />
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-white border border-slate-100 rounded-2xl shadow-sm animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-4">
        <GreetingHeader teacherName={teacher.teacher_name} periodCount={null} doneCount={0} />
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <h3 className="text-rose-800 font-bold mb-1">Connection Error</h3>
          <p className="text-sm text-rose-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2.5 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <GreetingHeader 
        teacherName={teacher.teacher_name} 
        periodCount={teaching.length} 
        doneCount={done}
      />

      {/* All-done celebration */}
      {/* Action Items Widget */}
      {actionItems.length > 0 && (
        <div className="mt-8 mb-4">
          <ActionItemsWidget 
            items={actionItems} 
            onResolved={() => setRefreshCounter(c => c + 1)} 
          />
        </div>
      )}

      {allDone ? (
        <AllDoneCard doneCount={done} />
      ) : (
        <>
          {/* Period cards — single column on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            {teaching.map((p) => {
              const isExpanded = p.slot.period_no === expandedPeriodNo;
              
              if (isExpanded) {
                return (
                  <div key={p.slot.slot_id} className="lg:col-span-2 cursor-pointer transition-all h-full" onClick={() => setExpandedPeriodNo(p.slot.period_no)}>
                    <ActivePeriodCard period={p} onRefresh={() => setRefreshCounter(c => c + 1)} />
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
        </>
      )}

      {/* Timeline strip */}
      {periods.length > 0 && (
        <div className="bg-white border border-border-subtle rounded-2xl p-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {periods.map((p) => (
              <TimelineChip key={p.slot.slot_id} period={p} />
            ))}
          </div>
        </div>
      )}

      {/* Weekly Progress Summary */}
      <WeeklyProgressCard teaching={teaching} done={done} />
    </section>
  );
}

/* ─── Greeting Header ────────────────────────────────────────────────────── */

function GreetingHeader({ teacherName, periodCount, doneCount }: { teacherName: string; periodCount: number | null; doneCount: number }) {
  const greeting = getGreeting();
  const name = firstName(teacherName);

  return (
    <div className="space-y-1">
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800">
        {greeting}, {name} 👋
      </h2>
      <p className="text-sm text-slate-500">
        {periodCount === null 
          ? 'Loading your schedule...' 
          : periodCount === 0
            ? "No teaching periods scheduled today"
            : `${periodCount} period${periodCount !== 1 ? 's' : ''} today${doneCount > 0 ? ` · ${doneCount} completed` : ''}`
        }
      </p>
    </div>
  );
}

/* ─── All Done Card ──────────────────────────────────────────────────────── */

function AllDoneCard({ doneCount }: { doneCount: number }) {
  return (
    <div className="bg-gradient-to-br from-emerald-50 via-white to-blue-50 border border-emerald-200/60 rounded-2xl p-6 sm:p-8 text-center shadow-sm">
      <div className="text-4xl mb-3">🎉</div>
      <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-1">All caught up for today!</h3>
      <p className="text-sm text-slate-500">
        {doneCount} period{doneCount !== 1 ? 's' : ''} completed · Great work!
      </p>
    </div>
  );
}

/* ─── Weekly Progress Card ───────────────────────────────────────────────── */

function WeeklyProgressCard({ teaching, done }: { teaching: DashboardPeriod[]; done: number }) {
  if (teaching.length === 0) return null;

  const behindCount = teaching.filter(p => p.pacing === 'behind').length;
  const pct = Math.round((done / teaching.length) * 100);

  return (
    <div className="bg-white border border-border-subtle rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-700">Today's Progress</h3>
        <span className="text-xs font-semibold text-slate-400">{done}/{teaching.length} periods</span>
      </div>
      
      {/* Progress bar */}
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500" />
          <span className="text-slate-500">{done} completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-slate-300" />
          <span className="text-slate-500">{teaching.length - done} remaining</span>
        </div>
        {behindCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-rose-600 font-medium">{behindCount} behind</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Bottom Grid ────────────────────────────────────────────────────────── */

function BottomGrid() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
      <QuickLinksCard />
      <LoadCard />
    </section>
  );
}
/* ─── Action Items Widget ────────────────────────────────────────────────── */

function ActionItemsWidget({ items, onResolved }: { items: ActionItem[], onResolved: () => void }) {
  const [resolving, setResolving] = useState<string | null>(null);
  const [justResolved, setJustResolved] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const visibleItems = items.filter(item => !dismissed.includes(item.topic_id)).slice(0, 3);

  const handleResolve = async (item: ActionItem) => {
    setResolving(item.topic_id);
    try {
      await resolveTopicStruggle(item.class_id, item.subject_id, item.topic_id);
      setJustResolved(item.topic_id);
      setTimeout(() => {
        setJustResolved(null);
        setDismissed(prev => [...prev, item.topic_id]); // Hide it locally immediately
        onResolved(); // Trigger silent dashboard refresh in background
      }, 1000);
    } catch (err) {
      console.error(err);
      alert('Failed to resolve topic.');
      setResolving(null);
    }
  };

  const handleDismiss = (topicId: string) => {
    setDismissed(prev => [...prev, topicId]);
  };

  if (visibleItems.length === 0) return null;

  return (
    <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 mb-6">
      <h3 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
        <span className="text-xl">⚠️</span> Pending Reviews
      </h3>
      <div className="space-y-3">
        {visibleItems.map(item => (
          <div key={item.topic_id} className="bg-white border border-orange-100 rounded-xl p-4 shadow-sm flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">{item.class_label} {item.subject_id}: {item.chapter_title}</p>
              <p className="text-sm text-slate-600 mt-1">Students struggled with: <span className="font-medium text-slate-900">{item.topic_title}</span></p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              {justResolved === item.topic_id ? (
                <button disabled className="text-xs bg-emerald-100 text-emerald-800 font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all">
                  <span>✅</span> OK
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => handleResolve(item)}
                    disabled={resolving === item.topic_id}
                    className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 font-semibold py-1.5 px-3 rounded-lg transition-colors"
                  >
                    {resolving === item.topic_id ? 'Resolving...' : 'Mark Resolved'}
                  </button>
                  <button 
                    onClick={() => handleDismiss(item.topic_id)}
                    className="text-xs text-slate-500 hover:text-slate-700 py-1"
                  >
                    Dismiss for today
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {items.length > visibleItems.length + dismissed.length && (
          <p className="text-xs text-center text-orange-600 mt-2 font-medium">
            +{items.length - (visibleItems.length + dismissed.length)} more pending
          </p>
        )}
      </div>
    </div>
  );
}
