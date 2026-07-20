import { useState, useEffect } from 'react';
import { getAllTeachers, upsertTeacher, deactivateTeacher, deleteTeacher, getAllClasses, getAllSubjects } from '../../lib/gateway';
import { Teacher, ClassInfo } from '../../lib/models';

export function TeachersTab() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Teacher>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  const loadTeachers = () => {
    setLoading(true);
    Promise.all([
      getAllTeachers(),
      getAllClasses(),
      getAllSubjects()
    ]).then(([tRes, cRes, sRes]) => {
      setTeachers(tRes || []);
      setClasses(cRes || []);
      setSubjects(sRes || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({ status: 'active' });
    setIsFormOpen(true);
  };

  const handleEdit = (t: Teacher) => {
    setEditingId(t.teacher_id);
    setFormData({ 
      ...t, 
      capable_subjects: t.capable_subjects || '',
      capable_classes: t.capable_classes || ''
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.teacher_name || !formData.short_name) return;
    
    setIsSubmitting(true);
    await upsertTeacher(formData);
    setIsSubmitting(false);
    setIsFormOpen(false);
    loadTeachers();
  };

  const handleToggleStatus = async (t: Teacher) => {
    const currentStatus = String(t.status || '').toLowerCase();
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    if (newStatus === 'inactive') {
      if (!confirm('Deactivating this teacher will NOT remove their active assignments. Reassign first. Continue?')) {
        return;
      }
    }

    // Optimistic update
    setTeachers(teachers.map(teacher => 
      teacher.teacher_id === t.teacher_id ? { ...teacher, status: newStatus } : teacher
    ));
    
    await upsertTeacher({ teacher_id: t.teacher_id, status: newStatus });
  };

  const handleDelete = async (t: Teacher) => {
    if (!confirm(`Are you sure you want to permanently delete ${t.teacher_name}? This action cannot be undone.`)) {
      return;
    }
    
    // Optimistic update
    setTeachers(teachers.filter(teacher => teacher.teacher_id !== t.teacher_id));
    
    await deleteTeacher(t.teacher_id);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Teachers</h1>
          <p className="text-slate-500">Manage the school's teaching staff.</p>
        </div>
        <button 
          onClick={handleAddNew}
          disabled={isFormOpen}
          className="px-4 py-2 bg-brand-primary text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
        >
          + Add Teacher
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-in slide-in-from-top-2">
          <h2 className="text-lg font-bold mb-4">{editingId ? 'Edit Teacher' : 'New Teacher'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
              <input required type="text" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-accent/20" 
                value={formData.teacher_name || ''} onChange={e => setFormData({...formData, teacher_name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Short Name *</label>
              <input required type="text" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-accent/20" 
                value={formData.short_name || ''} onChange={e => setFormData({...formData, short_name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-accent/20" 
                value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input type="tel" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-accent/20" 
                value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Capable Subjects (What can they teach?)</label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-slate-50">
                {subjects.map(s => {
                  const isSelected = (formData.capable_subjects || '').split(',').includes(s.subject_id);
                  return (
                    <label key={s.subject_id} className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-colors ${isSelected ? 'bg-brand-accent text-white border-brand-accent' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}>
                      <input type="checkbox" className="hidden" checked={isSelected} onChange={(e) => {
                        let current = (formData.capable_subjects || '').split(',').filter(Boolean);
                        if (e.target.checked) current.push(s.subject_id);
                        else current = current.filter(id => id !== s.subject_id);
                        setFormData({...formData, capable_subjects: current.join(',')});
                      }} />
                      {s.subject_name}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Capable Classes (Where can they teach?)</label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-slate-50">
                {classes.map(c => {
                  const isSelected = (formData.capable_classes || '').split(',').includes(c.class_id);
                  return (
                    <label key={c.class_id} className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-colors ${isSelected ? 'bg-brand-accent text-white border-brand-accent' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}>
                      <input type="checkbox" className="hidden" checked={isSelected} onChange={(e) => {
                        let current = (formData.capable_classes || '').split(',').filter(Boolean);
                        if (e.target.checked) current.push(c.class_id);
                        else current = current.filter(id => id !== c.class_id);
                        setFormData({...formData, capable_classes: current.join(',')});
                      }} />
                      {c.class_label.replace('CLASS_', 'Class ')}
                    </label>
                  );
                })}
              </div>
            </div>
            
            <div className="md:col-span-2 flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-brand-primary text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2 transition-colors">
                {isSubmitting ? 'Saving...' : '💾 Save Teacher'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12 text-slate-500"><span className="animate-pulse">Loading teachers...</span></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Capabilities</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {teachers.map(t => {
                  const isActive = String(t.status || '').toLowerCase() === 'active';
                  return (
                    <tr key={t.teacher_id} className={`transition-colors ${isActive ? 'hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-50'}`}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono transition-opacity ${isActive ? 'text-slate-500' : 'text-slate-400'}`}>
                        {t.teacher_id}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium transition-opacity ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                        {t.teacher_name} <span className="text-slate-400 font-normal">({t.short_name})</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">{t.email || '-'}</div>
                        <div className="text-sm text-slate-500">{t.phone || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 mb-1 max-w-[200px]">
                          {(t.capable_subjects || '').split(',').filter(Boolean).map(s => (
                            <span key={s} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">{subjects.find(sub => sub.subject_id === s)?.subject_name || s}</span>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(t.capable_classes || '').split(',').filter(Boolean).map(c => (
                            <span key={c} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold">{c.replace('CLASS_', 'Class ')}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleStatus(t)}
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
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleEdit(t)} className="px-3 py-1.5 text-slate-600 hover:text-brand-accent hover:bg-slate-100 rounded-lg transition-colors mr-2">
                          ✏️ Edit
                        </button>
                        <button onClick={() => handleDelete(t)} className="px-3 py-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {teachers.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No teachers found. Click 'Add Teacher' to create one.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
