import { useState, useEffect } from 'react';
import { getAdminPacing, getAllTeachers } from '../../lib/gateway';

export function PacingTab() {
  const [pacingData, setPacingData] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    Promise.all([
      getAdminPacing(),
      getAllTeachers()
    ]).then(([pacingRes, teachersRes]) => {
      setPacingData(pacingRes.pacing || []);
      setTeachers(teachersRes || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const getTeacherName = (id: string) => {
    const t = teachers.find(x => x.teacher_id === id);
    return t ? t.teacher_name : id;
  };

  const filteredData = pacingData.filter(item => {
    if (filterClass && item.class_id !== filterClass) return false;
    if (filterSubject && item.subject_id !== filterSubject) return false;
    if (filterStatus && item.status !== filterStatus) return false;
    return true;
  });

  const getStatusPill = (status: string) => {
    if (status === 'completed') return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">🟢 On Track</span>;
    if (status === 'in_progress') return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">🟡 In Progress</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">⚪ Not Started</span>;
  };

  if (loading) {
    return <div className="flex justify-center p-8"><span className="animate-pulse">Loading pacing data...</span></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Pacing Report</h1>
          <p className="text-slate-500">Track syllabus completion across all sections.</p>
        </div>
        
        <div className="flex gap-2">
          <select 
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
            value={filterClass} onChange={e => setFilterClass(e.target.value)}
          >
            <option value="">All Classes</option>
            <option value="CLASS_8">Class 8</option>
            <option value="CLASS_9">Class 9</option>
          </select>
          <select 
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
            value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
          >
            <option value="">All Subjects</option>
            <option value="SCI">Science</option>
            <option value="MATH">Mathematics</option>
          </select>
          <select 
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="completed">On Track</option>
            <option value="in_progress">In Progress</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Class/Sec</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Teacher</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Current Topic</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Last Taught</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filteredData.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No pacing data found.</td></tr>
            ) : filteredData.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 cursor-pointer">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                  {row.class_id.replace('CLASS_', '')}-{row.section_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {row.subject_id === 'SCI' ? 'Science' : row.subject_id === 'MATH' ? 'Maths' : row.subject_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {getTeacherName(row.teacher_id)}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                  {row.current_topic_id || 'Not started'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusPill(row.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {row.last_taught_date || 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
