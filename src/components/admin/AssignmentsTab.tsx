import { useState, useEffect } from 'react';
import { getAllAssignments, upsertAssignment, deactivateAssignment, getAllTeachers, getAllClasses, getAllSections, getAllSubjects, upsertTeacher } from '../../lib/gateway';

export function AssignmentsTab() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [selTeacher, setSelTeacher] = useState('');
  const [selSubject, setSelSubject] = useState('');
  const [selClass, setSelClass] = useState('');
  const [selSections, setSelSections] = useState<string[]>([]);
  const [selRole, setSelRole] = useState('primary');

  // Quick Teacher Edit State
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [teacherFormData, setTeacherFormData] = useState<any>({});
  const [isSavingTeacher, setIsSavingTeacher] = useState(false);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      getAllAssignments(), getAllTeachers(), getAllClasses(), getAllSections(), getAllSubjects()
    ]).then(([asRes, tRes, cRes, secRes, subRes]) => {
      setAssignments(asRes || []);
      setTeachers(tRes || []);
      setClasses(cRes || []);
      setSections(secRes || []);
      setSubjects(subRes || []);
      setLoading(false);
    });
  };

  useEffect(() => { loadAll(); }, []);

  const handleAddNew = () => {
    setSelTeacher('');
    setSelSubject('');
    setSelClass('');
    setSelSections([]);
    setSelRole('primary');
    setIsFormOpen(true);
  };

  const toggleSection = (secId: string) => {
    if (selSections.includes(secId)) {
      setSelSections(selSections.filter(s => s !== secId));
    } else {
      setSelSections([...selSections, secId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selTeacher || !selSubject || !selClass || selSections.length === 0) return;
    
    setIsSubmitting(true);
    // Create one assignment per section
    for (const sec of selSections) {
      await upsertAssignment({
        class_id: selClass,
        section_id: sec,
        subject_id: selSubject,
        teacher_id: selTeacher,
        role: selRole,
        status: 'active'
      });
    }
    
    setIsSubmitting(false);
    setIsFormOpen(false);
    loadAll();
  };

  const handleToggleStatus = async (a: any) => {
    const currentStatus = String(a.status || '').toLowerCase();
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    if (newStatus === 'inactive') {
      if (!confirm('Are you sure you want to deactivate this assignment?')) {
        return;
      }
    }

    // Optimistic update
    setAssignments(assignments.map(assign => 
      assign.assignment_id === a.assignment_id ? { ...assign, status: newStatus } : assign
    ));
    
    // In our mocked/live Gateway, there is upsertAssignment and deactivateAssignment.
    // If it's becoming inactive, we can just call deactivateAssignment.
    // If it's becoming active, we might need upsertAssignment.
    if (newStatus === 'inactive') {
      await deactivateAssignment(a.assignment_id);
    } else {
      await upsertAssignment({ ...a, status: newStatus });
    }
  };

  const getName = (list: any[], idField: string, nameField: string, id: string) => {
    const item = list.find(x => x[idField] === id);
    return item ? item[nameField] : id;
  };

  const getAvailableSections = () => {
    return sections.filter(s => s.class_id === selClass);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Assignments</h1>
          <p className="text-slate-500">Assign teachers to classes, sections, and subjects.</p>
        </div>
        <button 
          onClick={handleAddNew}
          disabled={isFormOpen}
          className="px-4 py-2 bg-brand-primary text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
        >
          + New Assignment
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-in slide-in-from-top-2">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><span>🔗</span> Create New Assignment</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">1. Where & What</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Class *</label>
                      <select required className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-accent/20" 
                        value={selClass} onChange={e => { setSelClass(e.target.value); setSelSections([]); }}>
                        <option value="">Select Class...</option>
                        {classes.map(c => (
                          <option key={c.class_id} value={c.class_id}>{c.class_label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
                      <select required className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-accent/20" 
                        value={selSubject} onChange={e => setSelSubject(e.target.value)}>
                        <option value="">Select Subject...</option>
                        {subjects.map(s => (
                          <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">2. Who</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-end mb-1">
                        <label className="block text-sm font-medium text-slate-700">Teacher *</label>
                        {selTeacher && (
                          <button type="button" onClick={() => {
                            const t = teachers.find(x => x.teacher_id === selTeacher);
                            if (t) {
                              setTeacherFormData({ ...t, capable_subjects: t.capable_subjects || '', capable_classes: t.capable_classes || '' });
                              setIsTeacherModalOpen(true);
                            }
                          }} className="text-xs text-brand-primary hover:underline flex items-center gap-1">
                            <span>✏️</span> Edit Teacher
                          </button>
                        )}
                      </div>
                      <select required className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-accent/20" 
                        value={selTeacher} onChange={e => setSelTeacher(e.target.value)}>
                        <option value="">Select Teacher...</option>
                        {teachers.filter(t => t.status === 'active').sort((a, b) => {
                          // Score capabilities based on selected class and subject
                          let scoreA = 0;
                          let scoreB = 0;
                          if (selClass) {
                            if ((a.capable_classes || '').includes(selClass)) scoreA += 1;
                            if ((b.capable_classes || '').includes(selClass)) scoreB += 1;
                          }
                          if (selSubject) {
                            if ((a.capable_subjects || '').includes(selSubject)) scoreA += 2;
                            if ((b.capable_subjects || '').includes(selSubject)) scoreB += 2;
                          }
                          return scoreB - scoreA; // Descending order
                        }).map(t => {
                          let label = t.teacher_name;
                          const isCapableClass = selClass && (t.capable_classes || '').includes(selClass);
                          const isCapableSubject = selSubject && (t.capable_subjects || '').includes(selSubject);
                          if (isCapableClass && isCapableSubject) label += ' (⭐️ Perfect Match)';
                          else if (isCapableSubject) label += ' (👍 Teaches Subject)';
                          else if (isCapableClass) label += ' (👍 Teaches Class)';
                          
                          return <option key={t.teacher_id} value={t.teacher_id}>{label}</option>
                        })}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Sections * (Select all that apply)</label>
                      
                      {!selClass ? (
                        <div className="p-3 bg-slate-100 rounded-lg text-sm text-slate-500 text-center border border-dashed border-slate-300">
                          Please select a class first to see its sections.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {getAvailableSections().length === 0 && <span className="text-sm text-slate-500">No sections found for this class.</span>}
                          {getAvailableSections().map(sec => (
                            <button
                              key={sec.section_id}
                              type="button"
                              onClick={() => toggleSection(sec.section_id)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                selSections.includes(sec.section_id) 
                                  ? 'bg-brand-accent text-white shadow-sm' 
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {sec.section_label || sec.section_id}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <label className="text-sm font-medium text-slate-700">Role:</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="role" value="primary" checked={selRole === 'primary'} onChange={() => setSelRole('primary')} className="text-brand-accent focus:ring-brand-accent" />
                <span className="text-sm">Primary</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="role" value="substitute" checked={selRole === 'substitute'} onChange={() => setSelRole('substitute')} className="text-brand-accent focus:ring-brand-accent" />
                <span className="text-sm">Substitute</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting || selSections.length === 0} className="px-4 py-2 bg-brand-primary text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2 transition-colors">
                {isSubmitting ? 'Saving...' : '💾 Create Assignment(s)'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12 text-slate-500"><span className="animate-pulse">Loading assignments...</span></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Class-Section</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Teacher</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {assignments.map(a => {
                  const isActive = String(a.status || '').toLowerCase() === 'active';
                  return (
                    <tr key={a.assignment_id} className={`transition-colors ${isActive ? 'hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-50'}`}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium transition-opacity ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                        {getName(classes, 'class_id', 'class_label', a.class_id)}-{a.section_id}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm transition-opacity ${isActive ? 'text-slate-600' : 'text-slate-400'}`}>
                        {getName(subjects, 'subject_id', 'subject_name', a.subject_id)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium transition-opacity ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                        {getName(teachers, 'teacher_id', 'teacher_name', a.teacher_id)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm capitalize transition-opacity ${isActive ? 'text-slate-600' : 'text-slate-400'}`}>
                        {a.role || 'primary'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleStatus(a)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 ${isActive ? 'bg-green-500' : 'bg-slate-300'}`}
                            role="switch"
                            aria-checked={isActive}
                          >
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                          <span className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-green-600' : 'text-slate-400'}`}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {assignments.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No assignments found. Click 'New Assignment' to create one.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isTeacherModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><span>✏️</span> Quick Edit: {teacherFormData.teacher_name}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Capable Subjects</label>
                <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-slate-50">
                  {subjects.map(s => {
                    const isSelected = (teacherFormData.capable_subjects || '').split(',').includes(s.subject_id);
                    return (
                      <label key={s.subject_id} className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-colors ${isSelected ? 'bg-brand-accent text-white border-brand-accent' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}>
                        <input type="checkbox" className="hidden" checked={isSelected} onChange={(e) => {
                          let current = (teacherFormData.capable_subjects || '').split(',').filter(Boolean);
                          if (e.target.checked) current.push(s.subject_id);
                          else current = current.filter(id => id !== s.subject_id);
                          setTeacherFormData({...teacherFormData, capable_subjects: current.join(',')});
                        }} />
                        {s.subject_name}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Capable Classes</label>
                <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-slate-50">
                  {classes.map(c => {
                    const isSelected = (teacherFormData.capable_classes || '').split(',').includes(c.class_id);
                    return (
                      <label key={c.class_id} className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-colors ${isSelected ? 'bg-brand-accent text-white border-brand-accent' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}>
                        <input type="checkbox" className="hidden" checked={isSelected} onChange={(e) => {
                          let current = (teacherFormData.capable_classes || '').split(',').filter(Boolean);
                          if (e.target.checked) current.push(c.class_id);
                          else current = current.filter(id => id !== c.class_id);
                          setTeacherFormData({...teacherFormData, capable_classes: current.join(',')});
                        }} />
                        {c.class_label.replace('CLASS_', 'Class ')}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button type="button" onClick={() => setIsTeacherModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
                Cancel
              </button>
              <button 
                disabled={isSavingTeacher} 
                onClick={async () => {
                  setIsSavingTeacher(true);
                  await upsertTeacher(teacherFormData);
                  const newTeachers = await getAllTeachers();
                  setTeachers(newTeachers || []);
                  setIsSavingTeacher(false);
                  setIsTeacherModalOpen(false);
                }}
                className="px-4 py-2 bg-brand-primary text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {isSavingTeacher ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
