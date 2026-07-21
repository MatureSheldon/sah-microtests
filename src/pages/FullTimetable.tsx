import { useState } from 'react';
import { MOCK_TIMETABLE } from '../lib/gateway-mock';

export function FullTimetable() {
  const [selectedTeacher, setSelectedTeacher] = useState('Mrs. Anjali Bisht');

  // Group timetable by day
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const maxPeriods = 8; // Assuming 8 periods a day max

  const teacherSchedule = MOCK_TIMETABLE.filter(entry => entry.teacher === selectedTeacher);

  const getEntry = (day: string, period: number) => {
    return teacherSchedule.find(e => e.day === day && e.period === period);
  };

  return (
    <div className="max-w-[1600px] w-full p-4 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Full Timetable</h1>
          <p className="text-slate-500 mt-1">Weekly schedule for the selected teacher.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
          <span className="text-sm font-semibold pl-2 text-slate-500">Teacher:</span>
          <select 
            value={selectedTeacher} 
            onChange={(e) => setSelectedTeacher(e.target.value)}
            className="bg-slate-50 border-none text-sm font-semibold py-2 px-4 rounded-lg outline-none cursor-pointer focus:ring-2 focus:ring-brand-accent/20"
          >
            <option value="Mrs. Anjali Bisht">Mrs. Anjali Bisht</option>
            <option value="Mr. Sharma">Mr. Sharma</option>
          </select>
        </div>
      </header>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4 font-bold text-slate-600 w-32 border-r border-slate-200">Day</th>
              {Array.from({ length: maxPeriods }).map((_, i) => (
                <th key={i} className="p-4 font-bold text-slate-600 text-center text-sm">
                  Period {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(day => (
              <tr key={day} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50">
                <td className="p-4 font-semibold text-slate-700 border-r border-slate-200 bg-white">
                  {day}
                </td>
                {Array.from({ length: maxPeriods }).map((_, i) => {
                  const entry = getEntry(day, i + 1);
                  return (
                    <td key={i} className="p-2 border-r border-slate-100 last:border-r-0 text-center align-top min-w-[120px]">
                      {entry ? (
                        <div className="h-full bg-brand-accent/5 border border-brand-accent/20 rounded-lg p-2 flex flex-col items-center justify-center gap-1 hover:border-brand-accent/40 transition-colors cursor-default">
                          <span className="text-xs font-bold text-brand-accent bg-white px-2 py-0.5 rounded shadow-sm">
                            Class {entry.klass}
                          </span>
                          <span className="text-xs font-medium text-slate-600 line-clamp-1 text-center">
                            {entry.subject}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {entry.periodStart} - {entry.periodEnd}
                          </span>
                        </div>
                      ) : (
                        <div className="h-full w-full flex items-center justify-center p-2">
                          <span className="text-slate-300 text-xs">—</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
