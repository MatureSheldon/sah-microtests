import { useState, useEffect } from 'react';
import { getAllClasses, upsertClass, getAllSections, upsertSection, getAllSubjects, upsertSubject, getAllAssignments, upsertAssignment } from '../../lib/gateway';

export function SchoolSetupTab() {
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  // Drill-down selection state
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Form states
  const [newClassLabel, setNewClassLabel] = useState('');
  const [newSectionLabel, setNewSectionLabel] = useState('');
  
  // Subject assignment form state
  const [subjectMode, setSubjectMode] = useState<'existing' | 'new'>('existing');
  const [selSubjectId, setSelSubjectId] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');

  const loadAll = async () => {
    setLoading(true);
    const [cRes, secRes, subRes, aRes] = await Promise.all([
      getAllClasses(), getAllSections(), getAllSubjects(), getAllAssignments()
    ]);
    setClasses(cRes || []);
    setSections(secRes || []);
    setSubjects(subRes || []);
    setAssignments(aRes || []);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassLabel) return;
    const class_id = 'CLASS_' + newClassLabel.replace(/\s+/g, '').toUpperCase();
    await upsertClass({ class_id, class_label: newClassLabel, status: 'active' });
    setNewClassLabel('');
    loadAll();
    setSelectedClassId(class_id);
    setSelectedSectionId(null);
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !newSectionLabel) return;
    const cleanSectionLabel = newSectionLabel.toUpperCase().trim();
    // Make section_id unique across classes so "Section A" in Class 8 doesn't overwrite "Section A" in Class 9
    const section_id = `${selectedClassId}_${cleanSectionLabel}`;
    await upsertSection({ class_id: selectedClassId, section_id, section_label: cleanSectionLabel, status: 'active' });
    setNewSectionLabel('');
    loadAll();
    setSelectedSectionId(section_id);
  };

  const handleAddSubjectToSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !selectedSectionId) return;

    let finalSubjectId = selSubjectId;

    if (subjectMode === 'new') {
      if (!newSubjectName || !newSubjectCode) return;
      const subRes = await upsertSubject({ 
        subject_id: newSubjectCode.toUpperCase(), 
        subject_name: newSubjectName, 
        subject_code: newSubjectCode.toUpperCase(), 
        status: 'active' 
      });
      finalSubjectId = subRes.subject_id;
    }

    if (!finalSubjectId) return;

    // Create assignment without teacher_id (can be added later in AssignmentsTab)
    await upsertAssignment({
      class_id: selectedClassId,
      section_id: selectedSectionId,
      subject_id: finalSubjectId,
      teacher_id: '',
      role: 'primary',
      status: 'active'
    });

    setSelSubjectId('');
    setNewSubjectName('');
    setNewSubjectCode('');
    setSubjectMode('existing');
    loadAll();
  };

  const activeSections = sections.filter(s => s.class_id === selectedClassId);
  const activeAssignments = assignments.filter(a => a.class_id === selectedClassId && a.section_id === selectedSectionId && a.status === 'active');

  const formatClassLabel = (label: string) => {
    if (!label) return 'Unknown Class';
    return label.toLowerCase().includes('class') ? label : `Class ${label}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-1">School Setup</h1>
        <p className="text-slate-500">Define your school's structural hierarchy: Classes ➡️ Sections ➡️ Subjects.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Column 1: Classes */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[600px] overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-bold text-slate-800 flex items-center gap-2"><span>🏫</span> 1. Classes</h2>
          </div>
          <div className="p-4 border-b border-slate-100 bg-white shadow-sm z-10">
            <form onSubmit={handleAddClass} className="space-y-3">
              <div>
                <input type="text" placeholder="New Class Name (e.g. 9)" required className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-accent/20" value={newClassLabel} onChange={e => setNewClassLabel(e.target.value)} />
              </div>
              <button type="submit" className="w-full px-3 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors">+ Add Class</button>
            </form>
          </div>
          <div className="flex-1 overflow-y-auto p-2 bg-slate-50/30">
            {loading && classes.length === 0 ? <div className="p-4 text-center text-slate-400 animate-pulse">Loading...</div> : (
              <ul className="space-y-1">
                {classes.length === 0 && <li className="p-4 text-center text-sm text-slate-400">No classes found.</li>}
                {classes.map(c => {
                  const isSelected = selectedClassId === c.class_id;
                  return (
                    <li key={c.class_id} 
                        onClick={() => { setSelectedClassId(c.class_id); setSelectedSectionId(null); }}
                        className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-all border ${isSelected ? 'bg-brand-accent/10 border-brand-accent/30 shadow-sm' : 'hover:bg-white border-transparent hover:border-slate-200'}`}>
                      <span className={`font-medium ${isSelected ? 'text-brand-accent' : 'text-slate-700'}`}>{formatClassLabel(c.class_label)}</span>
                      {isSelected && <span className="text-brand-accent">➡️</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Column 2: Sections */}
        <div className={`bg-white border rounded-2xl shadow-sm flex flex-col h-[600px] overflow-hidden transition-all duration-300 ${selectedClassId ? 'border-slate-200 opacity-100' : 'border-slate-100 opacity-50 grayscale'}`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-bold text-slate-800 flex items-center gap-2"><span>🏷️</span> 2. Sections</h2>
          </div>
          <div className="p-4 border-b border-slate-100 bg-white shadow-sm z-10">
            <form onSubmit={handleAddSection} className="space-y-3">
              <div>
                <input type="text" placeholder="New Section Name (e.g. A)" required disabled={!selectedClassId} className="w-full px-3 py-2 border rounded-lg text-sm outline-none uppercase focus:ring-2 focus:ring-brand-accent/20 disabled:bg-slate-50 disabled:cursor-not-allowed" value={newSectionLabel} onChange={e => setNewSectionLabel(e.target.value)} />
              </div>
              <button type="submit" disabled={!selectedClassId} className="w-full px-3 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">+ Add Section</button>
            </form>
          </div>
          <div className="flex-1 overflow-y-auto p-2 bg-slate-50/30">
            {!selectedClassId ? (
              <div className="p-8 text-center text-sm text-slate-400">👈 Select a class first</div>
            ) : (
              <ul className="space-y-1">
                {activeSections.length === 0 && <li className="p-4 text-center text-sm text-slate-400">No sections in this class.</li>}
                {activeSections.map((s, idx) => {
                  const isSelected = selectedSectionId === s.section_id;
                  const c = classes.find(x => x.class_id === s.class_id);
                  return (
                    <li key={idx} 
                        onClick={() => setSelectedSectionId(s.section_id)}
                        className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-all border ${isSelected ? 'bg-brand-accent/10 border-brand-accent/30 shadow-sm' : 'hover:bg-white border-transparent hover:border-slate-200'}`}>
                      <span className={`font-medium ${isSelected ? 'text-brand-accent' : 'text-slate-700'}`}>
                        {formatClassLabel(c?.class_label)} <span className="opacity-50 mx-1">-</span> {s.section_label || s.section_id}
                      </span>
                      {isSelected && <span className="text-brand-accent">➡️</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Column 3: Subjects */}
        <div className={`bg-white border rounded-2xl shadow-sm flex flex-col h-[600px] overflow-hidden transition-all duration-300 ${selectedSectionId ? 'border-slate-200 opacity-100' : 'border-slate-100 opacity-50 grayscale'}`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-bold text-slate-800 flex items-center gap-2"><span>📚</span> 3. Subjects</h2>
          </div>
          <div className="p-4 border-b border-slate-100 bg-white shadow-sm z-10">
            <form onSubmit={handleAddSubjectToSection} className="space-y-3">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                <button type="button" onClick={() => setSubjectMode('existing')} className={`flex-1 py-1 text-xs font-medium rounded ${subjectMode === 'existing' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Existing</button>
                <button type="button" onClick={() => setSubjectMode('new')} className={`flex-1 py-1 text-xs font-medium rounded ${subjectMode === 'new' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>New</button>
              </div>

              {subjectMode === 'existing' ? (
                <select required disabled={!selectedSectionId} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-accent/20 disabled:bg-slate-50" value={selSubjectId} onChange={e => setSelSubjectId(e.target.value)}>
                  <option value="">Select global subject...</option>
                  {subjects.map(s => <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>)}
                </select>
              ) : (
                <div className="space-y-2">
                  <div>
                    <select required disabled={!selectedSectionId} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-accent/20 disabled:bg-slate-50" value={newSubjectCode === '' ? '' : (['MATH', 'SCI', 'ENG', 'HIN', 'SST', 'COMP'].includes(newSubjectCode) ? newSubjectCode : 'CUSTOM')} onChange={e => {
                      const val = e.target.value;
                      if (val === 'CUSTOM') {
                        setNewSubjectCode('CUSTOM_');
                      } else {
                        setNewSubjectCode(val);
                        // Auto-fill name
                        const names: Record<string, string> = { MATH: 'Mathematics', SCI: 'Science', ENG: 'English', HIN: 'Hindi', SST: 'Social Science', COMP: 'Computer Science' };
                        if (names[val]) setNewSubjectName(names[val]);
                      }
                    }}>
                      <option value="">Select Standard Code...</option>
                      <option value="MATH">MATH (Mathematics)</option>
                      <option value="SCI">SCI (Science)</option>
                      <option value="ENG">ENG (English)</option>
                      <option value="HIN">HIN (Hindi)</option>
                      <option value="SST">SST (Social Science)</option>
                      <option value="COMP">COMP (Computer Science)</option>
                      <option value="CUSTOM">Other / Custom Code...</option>
                    </select>
                    {newSubjectCode && !['MATH', 'SCI', 'ENG', 'HIN', 'SST', 'COMP'].includes(newSubjectCode) && (
                      <input type="text" placeholder="Type Custom Code (e.g. ART)" required disabled={!selectedSectionId} className="w-full mt-2 px-3 py-2 border rounded-lg text-sm outline-none uppercase focus:ring-2 focus:ring-brand-accent/20 disabled:bg-slate-50" value={newSubjectCode === 'CUSTOM_' ? '' : newSubjectCode} onChange={e => setNewSubjectCode(e.target.value.toUpperCase())} />
                    )}
                  </div>
                  <input type="text" placeholder="Subject Name (e.g. Mathematics)" required disabled={!selectedSectionId} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-accent/20 disabled:bg-slate-50" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} />
                </div>
              )}
              <button type="submit" disabled={!selectedSectionId} className="w-full px-3 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                + Assign Subject
              </button>
            </form>
          </div>
          <div className="flex-1 overflow-y-auto p-2 bg-slate-50/30">
            {!selectedSectionId ? (
              <div className="p-8 text-center text-sm text-slate-400">👈 Select a section first</div>
            ) : (
              <ul className="space-y-1">
                {activeAssignments.length === 0 && <li className="p-4 text-center text-sm text-slate-400">No subjects assigned yet.</li>}
                {activeAssignments.map(a => {
                  const s = subjects.find(x => x.subject_id === a.subject_id);
                  return (
                    <li key={a.assignment_id} className="flex flex-col p-3 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors">
                      <span className="font-medium text-slate-700">{s?.subject_name || a.subject_id}</span>
                      <span className="text-xs text-slate-400 flex items-center gap-2">
                        <span className="font-mono">{s?.subject_code || ''}</span>
                        {a.teacher_id ? <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">Teacher Assigned</span> : <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">Needs Teacher</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
