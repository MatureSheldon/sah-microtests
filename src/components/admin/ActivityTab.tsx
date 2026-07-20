import { useState, useEffect } from 'react';
import { getAdminActivity, getAllTeachers } from '../../lib/gateway';

export function ActivityTab({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [activityData, setActivityData] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAdminActivity(),
      getAllTeachers()
    ]).then(([actRes, teachersRes]) => {
      setActivityData(actRes.activity || []);
      setTeachers(teachersRes || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Aggregate by teacher
  const statsByTeacher = teachers.map(t => {
    const logs = activityData.filter(l => l.teacher_id === t.teacher_id);
    const periodsTaught = logs.length;
    const skipped = logs.filter(l => l.action_type === 'skipped' || l.action_type === 'period_not_taught').length;
    const struggled = logs.filter(l => l.student_understanding === 'Struggled').length;
    const notesLogged = logs.filter(l => (l.notes || '').trim().length > 0).length;
    
    // Sort to find last active
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const lastActive = logs.length > 0 ? new Date(logs[0].timestamp).toLocaleDateString() : 'Never';
    
    // Flag if last active > 2 days
    let isStale = false;
    if (logs.length > 0) {
      const diffTime = Math.abs(new Date().getTime() - new Date(logs[0].timestamp).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      isStale = diffDays > 2;
    } else {
      isStale = true;
    }

    return {
      teacher_id: t.teacher_id,
      name: t.teacher_name,
      status: t.status,
      periodsTaught,
      skipped,
      struggled,
      notesLogged,
      lastActive,
      isStale
    };
  }).filter(t => t.status === 'active');

  const totalPeriods = statsByTeacher.reduce((sum, t) => sum + t.periodsTaught, 0);
  const totalStruggled = statsByTeacher.reduce((sum, t) => sum + t.struggled, 0);
  const totalSkipped = statsByTeacher.reduce((sum, t) => sum + t.skipped, 0);

  if (loading) {
    return <div className="flex justify-center p-8"><span className="animate-pulse">Loading activity...</span></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Teacher Activity</h1>
        <p className="text-slate-500">Monitor engagement and system usage quality.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-3xl font-bold text-slate-800">{totalPeriods}</div>
          <div className="text-sm font-medium text-slate-500">Total periods logged</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-3xl font-bold text-orange-600">{totalStruggled}</div>
          <div className="text-sm font-medium text-slate-500">"Struggled" ratings</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-3xl font-bold text-slate-600">{totalSkipped}</div>
          <div className="text-sm font-medium text-slate-500">Skipped/Not Taught</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Teacher</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Periods Logged</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Skipped</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Struggled Ratings</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Notes Logged</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Last Active</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {statsByTeacher.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No teachers found.</td></tr>
            ) : statsByTeacher.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                  {row.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-semibold">
                  {row.periodsTaught}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {row.skipped}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                  {row.struggled > 0 ? (
                    <button className="underline decoration-orange-300 hover:text-orange-800" onClick={() => onNavigate && onNavigate('pacing')}>
                      {row.struggled}
                    </button>
                  ) : 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {row.notesLogged}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${row.isStale ? 'text-red-600' : 'text-slate-500'}`}>
                  {row.isStale && <span className="mr-1">⚠️</span>}
                  {row.lastActive}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
