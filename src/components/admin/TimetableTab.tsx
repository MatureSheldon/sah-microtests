import { useState, useEffect } from 'react';
import { 
  getSchoolDayStructure, saveSchoolDayStructure, 
  getTimetableForSection, saveTimetableGrid, cloneTimetable,
  getAllClasses, getAllSections, getAllSubjects, getAllAssignments,
  generateTimetable, getAllTimetableSlots, getAllTeachers
} from '../../lib/gateway';

export function TimetableTab() {
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Layer 1: School Day Structure
  const [showStructureEditor, setShowStructureEditor] = useState(false);
  const [structure, setStructure] = useState<any[]>([
    { period_no: 1, start_time: '08:30', end_time: '09:15', slot_type: 'instructional' },
    { period_no: 2, start_time: '09:15', end_time: '10:00', slot_type: 'instructional' },
    { period_no: 3, start_time: '10:00', end_time: '10:45', slot_type: 'instructional' },
    { period_no: 4, start_time: '10:45', end_time: '11:15', slot_type: 'break' },
    { period_no: 5, start_time: '11:15', end_time: '12:00', slot_type: 'instructional' },
    { period_no: 6, start_time: '12:00', end_time: '12:45', slot_type: 'instructional' },
    { period_no: 7, start_time: '12:45', end_time: '13:30', slot_type: 'instructional' },
  ]);

  // Layer 2: Grid Selection
  const [selClass, setSelClass] = useState('');
  const [selSection, setSelSection] = useState('');
  const [gridData, setGridData] = useState<any[]>([]); // active slots for current selection
  const [isGridLoading, setIsGridLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Cell Editor state
  const [activeCell, setActiveCell] = useState<{day: string, period: number} | null>(null);

  // Layer 3: Clone State
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneTargets, setCloneTargets] = useState<string[]>([]);
  const [isCloning, setIsCloning] = useState(false);

  // Layer 4: Auto-Generate & Master View
  const [isMasterView, setIsMasterView] = useState(false);
  const [showAutoGenModal, setShowAutoGenModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [frequencies, setFrequencies] = useState<Record<string, number>>({'MATH': 6, 'SCI': 6, 'ENG': 6});

  // Master View Data
  const [allSlots, setAllSlots] = useState<any[]>([]);
  const [masterViewType, setMasterViewType] = useState<'classes' | 'teachers'>('classes');
  const [isMasterLoading, setIsMasterLoading] = useState(false);
  const [isSavingStructure, setIsSavingStructure] = useState(false);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const instructionalPeriods = structure.filter(s => s.slot_type === 'instructional').length;

  useEffect(() => {
    Promise.all([
      getAllClasses(), getAllSections(), getAllSubjects(), getAllAssignments(), getSchoolDayStructure(), getAllTeachers()
    ]).then(([cRes, secRes, subRes, aRes, structRes, tRes]) => {
      setClasses(cRes || []);
      setSections(secRes || []);
      setSubjects(subRes || []);
      setAssignments(aRes || []);
      setTeachers(tRes || []);
      if (structRes && structRes.structure && structRes.structure.length > 0) {
        setStructure(structRes.structure);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (isMasterView) {
      if (allSlots.length === 0) {
        setIsMasterLoading(true);
        getAllTimetableSlots().then(res => {
          setAllSlots(res.slots || []);
          setIsMasterLoading(false);
        });
      }
    } else {
      if (selClass && selSection) {
        setIsGridLoading(true);
        getTimetableForSection(selClass, selSection).then(res => {
          setGridData(res.slots || []);
          setIsGridLoading(false);
        });
      } else {
        setGridData([]);
      }
    }
  }, [selClass, selSection, isMasterView]);

  const getAvailableSections = () => sections.filter(s => s.class_id === selClass);
  const getSubjectColor = (subjectId: string) => {
    const colors = ['bg-blue-100 border-blue-200 text-blue-800', 'bg-green-100 border-green-200 text-green-800', 'bg-purple-100 border-purple-200 text-purple-800', 'bg-yellow-100 border-yellow-200 text-yellow-800', 'bg-pink-100 border-pink-200 text-pink-800', 'bg-indigo-100 border-indigo-200 text-indigo-800', 'bg-orange-100 border-orange-200 text-orange-800'];
    const idx = subjects.findIndex(s => s.subject_id === subjectId);
    return idx >= 0 ? colors[idx % colors.length] : 'bg-slate-100 border-slate-200 text-slate-800';
  };

  const handleCellClick = (day: string, period_no: number, slot_type: string) => {
    if (slot_type === 'break') return; // Cannot edit breaks
    setActiveCell({ day, period: period_no });
  };

  const updateCell = (subject_id: string | null) => {
    if (!activeCell) return;
    
    let newData = [...gridData];
    // Remove existing for this cell
    newData = newData.filter(s => !(s.day === activeCell.day && s.period_no === activeCell.period));
    
    if (subject_id) {
      // Find assignment for this class-section-subject to resolve teacher
      const assignment = assignments.find(a => a.class_id === selClass && a.section_id === selSection && a.subject_id === subject_id && a.status !== 'inactive');
      
      const periodStruct = structure.find(s => s.period_no === activeCell.period);
      newData.push({
        day: activeCell.day,
        period_no: activeCell.period,
        start_time: periodStruct?.start_time || '',
        end_time: periodStruct?.end_time || '',
        slot_type: 'instructional',
        class_id: selClass,
        section_id: selSection,
        subject_id: subject_id,
        assignment_id: assignment ? assignment.assignment_id : '',
        teacher_id: assignment ? assignment.teacher_id : '',
      });
    }
    
    setGridData(newData);
    setActiveCell(null);
  };

  const handleSaveGrid = async () => {
    if (!selClass || !selSection) return;
    setIsSaving(true);
    await saveTimetableGrid(selClass, selSection, gridData);
    setIsSaving(false);
  };

  const handleCloneSubmit = async () => {
    if (!selClass || !selSection || cloneTargets.length === 0) return;
    setIsCloning(true);
    for (const targetId of cloneTargets) {
      await cloneTimetable(selClass, selSection, selClass, targetId);
    }
    setIsCloning(false);
    setShowCloneModal(false);
    setCloneTargets([]);
    alert('Timetable cloned successfully!');
  };

  // Stats
  const subjectStats = subjects.map(sub => {
    const count = gridData.filter(s => s.subject_id === sub.subject_id).length;
    return { ...sub, count };
  }).filter(s => s.count > 0).sort((a,b) => b.count - a.count);

  const filledSlots = gridData.length;
  const totalSlots = days.length * instructionalPeriods;

  if (loading) return (
    <div className="max-w-[1400px] mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-12 text-center text-slate-500">
        <span className="animate-pulse">Loading timetable data...</span>
      </div>
    </div>
  );

  const handleAutoGen = async () => {
    setIsGenerating(true);
    const res = await generateTimetable({ class_id: selClass, section_id: selSection, frequencies });
    if (res.ok && res.proposed_slots) {
      setGridData(res.proposed_slots);
      setShowAutoGenModal(false);
    } else {
      alert("Failed to generate timetable.");
    }
    setIsGenerating(false);
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Timetable Builder</h1>
          <p className="text-slate-500">Interactive grid for managing class schedules.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsMasterView(!isMasterView)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 border ${isMasterView ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
          >
            <span>🗺️</span> {isMasterView ? 'Exit Master View' : 'Master View'}
          </button>
          <button 
            onClick={() => setShowStructureEditor(!showStructureEditor)}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 flex items-center gap-2"
          >
            <span>📐</span> {showStructureEditor ? 'Hide Structure' : 'School Day Structure'}
          </button>
        </div>
      </div>

      {showStructureEditor && (
        <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-sm animate-in slide-in-from-top-2">
          <h2 className="text-lg font-bold mb-4">School Day Structure</h2>
          <p className="text-sm text-slate-400 mb-4">This defines the template for all class timetables.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {structure.map((s, i) => (
              <div key={i} className="bg-slate-700 p-3 rounded-xl border border-slate-600">
                <div className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-wider">
                  Period {s.period_no}
                </div>
                <div className="flex gap-2 mb-2">
                  <input type="time" value={s.start_time} onChange={(e) => {
                    const newStruct = [...structure];
                    newStruct[i].start_time = e.target.value;
                    setStructure(newStruct);
                  }} className="bg-slate-900 border border-slate-600 rounded p-1 text-sm w-full outline-none focus:border-brand-primary" />
                  <input type="time" value={s.end_time} onChange={(e) => {
                    const newStruct = [...structure];
                    newStruct[i].end_time = e.target.value;
                    setStructure(newStruct);
                  }} className="bg-slate-900 border border-slate-600 rounded p-1 text-sm w-full outline-none focus:border-brand-primary" />
                </div>
                <div className="flex gap-2 text-xs">
                  <select value={s.slot_type} onChange={(e) => {
                    const newStruct = [...structure];
                    newStruct[i].slot_type = e.target.value;
                    setStructure(newStruct);
                  }} className="bg-slate-900 border border-slate-600 rounded p-1 w-full text-slate-300 outline-none">
                    <option value="instructional">Instructional</option>
                    <option value="break">Break</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
          <button 
            disabled={isSavingStructure}
            onClick={async () => {
              setIsSavingStructure(true);
              const res = await saveSchoolDayStructure({ structure });
              if (res && res.ok) alert('School day structure saved globally!');
              else alert('Failed to save structure.');
              setIsSavingStructure(false);
            }}
            className="px-4 py-2 bg-brand-primary text-white rounded-lg font-medium hover:bg-brand-primary/80 disabled:opacity-50"
          >
            {isSavingStructure ? 'Saving...' : 'Save Structure'}
          </button>
        </div>
      )}

      {/* Grid Selector */}
      {!isMasterView && (
        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 font-medium text-slate-700">
            Select Schedule to Edit:
          </div>
          <select className="px-4 py-2 border rounded-xl outline-none bg-slate-50 min-w-[150px]" value={selClass} onChange={e => { setSelClass(e.target.value); setSelSection(''); }}>
            <option value="">Select Class...</option>
            {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.class_label}</option>)}
          </select>
          {selClass && (
            <select className="px-4 py-2 border rounded-xl outline-none bg-slate-50 min-w-[150px]" value={selSection} onChange={e => setSelSection(e.target.value)}>
              <option value="">Select Section...</option>
              {getAvailableSections().map(s => <option key={s.section_id} value={s.section_id}>Section {s.section_id}</option>)}
            </select>
          )}
        </div>
      )}

      {/* Master View */}
      {isMasterView && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-wrap gap-4 items-center justify-between">
            <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <span>🗺️</span> School Master Timetable
            </h2>
            <div className="flex bg-slate-200 p-1 rounded-lg">
              <button 
                onClick={() => setMasterViewType('classes')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${masterViewType === 'classes' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-600 hover:text-slate-800'}`}
              >
                Classes View
              </button>
              <button 
                onClick={() => setMasterViewType('teachers')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${masterViewType === 'teachers' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-600 hover:text-slate-800'}`}
              >
                Teachers View
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[70vh]">
            {isMasterLoading ? (
              <div className="p-12 text-center text-slate-400">Loading master timetable...</div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead className="sticky top-0 bg-slate-50 z-20">
                  <tr>
                    <th className="p-3 border-b border-r border-slate-200 w-32 bg-slate-100 sticky left-0 z-30 shadow-[1px_0_0_0_#e2e8f0]">
                      {masterViewType === 'classes' ? 'Class' : 'Teacher'}
                    </th>
                    {days.map(day => (
                      <th key={day} colSpan={instructionalPeriods} className="p-2 border-b border-r border-slate-200 text-center font-bold text-slate-700 bg-slate-100">
                        {day}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th className="p-2 border-b border-r border-slate-200 bg-slate-50 sticky left-0 z-30 shadow-[1px_0_0_0_#e2e8f0]"></th>
                    {days.map(day => (
                      structure.filter(p => p.slot_type === 'instructional').map(p => (
                        <th key={`${day}-${p.period_no}`} className="p-1.5 border-b border-r border-slate-200 text-center bg-white min-w-[60px]">
                          <div className="text-[10px] font-bold text-slate-500 uppercase">P{p.period_no}</div>
                        </th>
                      ))
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {masterViewType === 'classes' ? (
                    // CLASSES VIEW
                    classes.map(c => (
                      sections.filter(s => s.class_id === c.class_id).map(sec => (
                        <tr key={`${c.class_id}-${sec.section_id}`} className="hover:bg-slate-50/50">
                          <td className="p-2 border-b border-r border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 sticky left-0 z-10 shadow-[1px_0_0_0_#e2e8f0]">
                            {c.class_label}-{sec.section_id}
                          </td>
                          {days.map(day => (
                            structure.filter(p => p.slot_type === 'instructional').map(p => {
                              const slot = allSlots.find(s => s.class_id === c.class_id && s.section_id === sec.section_id && s.day === day && s.period_no === p.period_no && s.status === 'active');
                              return (
                                <td key={`${c.class_id}-${sec.section_id}-${day}-${p.period_no}`} className="p-1 border-b border-r border-slate-200 text-center relative h-10">
                                  {slot ? (
                                    <div className={`w-full h-full rounded text-[10px] font-bold flex items-center justify-center ${getSubjectColor(slot.subject_id)}`} title={`${slot.subject_id} by ${slot.teacher_id}`}>
                                      {subjects.find(s=>s.subject_id===slot.subject_id)?.subject_code || slot.subject_id}
                                    </div>
                                  ) : (
                                    <div className="w-full h-full bg-slate-50/50 rounded flex items-center justify-center text-[10px] text-slate-300">-</div>
                                  )}
                                </td>
                              );
                            })
                          ))}
                        </tr>
                      ))
                    ))
                  ) : (
                    // TEACHERS VIEW
                    teachers.filter(t => t.status === 'active').map(teacher => {
                      const tid = teacher.teacher_id;
                      return (
                        <tr key={String(tid)} className="hover:bg-slate-50/50">
                          <td className="p-2 border-b border-r border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 sticky left-0 z-10 shadow-[1px_0_0_0_#e2e8f0]">
                            {teacher.short_name}
                          </td>
                          {days.map(day => (
                            structure.filter(p => p.slot_type === 'instructional').map(p => {
                              const slot = allSlots.find(s => s.teacher_id === tid && s.day === day && s.period_no === p.period_no && s.status === 'active');
                              return (
                                <td key={`${tid}-${day}-${p.period_no}`} className="p-1 border-b border-r border-slate-200 text-center relative h-10">
                                  {slot ? (
                                    <div className={`w-full h-full rounded text-[10px] font-bold flex flex-col items-center justify-center ${getSubjectColor(slot.subject_id)}`} title={`${slot.class_id}-${slot.section_id} ${slot.subject_id}`}>
                                      <span>{classes.find(c=>c.class_id===slot.class_id)?.class_label}-{slot.section_id}</span>
                                    </div>
                                  ) : (
                                    <div className="w-full h-full bg-green-50 text-green-600 rounded flex items-center justify-center text-[10px] font-bold border border-green-100">Free</div>
                                  )}
                                </td>
                              );
                            })
                          ))}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Main Grid Editor */}
      {!isMasterView && selClass && selSection && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-lg">
              Class {classes.find(c=>c.class_id===selClass)?.class_label} - Section {selSection}
            </h2>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowAutoGenModal(true)} className="px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 flex items-center gap-2 transition-colors">
                <span>🪄</span> Auto-Generate
              </button>
              <button onClick={() => setShowCloneModal(true)} className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2">
                <span>📋</span> Clone...
              </button>
              <button disabled={isSaving} onClick={handleSaveGrid} className="px-4 py-1.5 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-slate-800 flex items-center gap-2">
                {isSaving ? 'Saving...' : '💾 Save Grid'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {isGridLoading ? (
              <div className="p-12 text-center text-slate-400">Loading timetable...</div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr>
                    <th className="p-3 bg-slate-50 border-b border-r border-slate-200 w-24"></th>
                    {structure.map(p => (
                      <th key={p.period_no} className="p-3 bg-slate-50 border-b border-slate-200 text-center relative">
                        <div className="text-xs font-bold text-slate-500 uppercase">
                          {p.slot_type === 'break' ? 'Break' : `Period ${p.period_no}`}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-1">
                          {p.start_time} - {p.end_time}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {days.map(day => (
                    <tr key={day} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/30">
                      <td className="p-3 font-semibold text-sm text-slate-700 border-r border-slate-200 bg-slate-50/50">
                        {day}
                      </td>
                      {structure.map(p => {
                        const isBreak = p.slot_type === 'break';
                        const slot = gridData.find(s => s.day === day && s.period_no === p.period_no);
                        const isActive = activeCell?.day === day && activeCell?.period === p.period_no;
                        
                        return (
                          <td key={p.period_no} className="p-1 border-r border-slate-100 last:border-0 relative">
                            {isBreak ? (
                              <div className="h-16 flex items-center justify-center bg-slate-100 rounded-lg">
                                <span className="text-xl opacity-50">☕</span>
                              </div>
                            ) : (
                              <div 
                                onClick={() => handleCellClick(day, p.period_no, p.slot_type)}
                                className={`h-16 rounded-lg border flex flex-col items-center justify-center cursor-pointer transition-all ${
                                  slot ? getSubjectColor(slot.subject_id) : 'bg-white border-slate-200 border-dashed hover:border-slate-400 hover:bg-slate-50 text-slate-300'
                                } ${isActive ? 'ring-2 ring-brand-primary ring-offset-1 z-10' : ''}`}
                              >
                                {slot ? (
                                  <>
                                    <span className="font-bold text-sm">{subjects.find(s=>s.subject_id===slot.subject_id)?.subject_code || slot.subject_id}</span>
                                    {!slot.teacher_id && <span className="absolute top-1 right-1 text-[10px]" title="No teacher assigned">⚠️</span>}
                                  </>
                                ) : (
                                  <span className="text-xs font-medium opacity-50">+ Add</span>
                                )}
                              </div>
                            )}

                            {/* Subject Picker Popover */}
                            {isActive && (
                              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-3 animate-in fade-in zoom-in-95 duration-100">
                                <div className="text-xs font-bold text-slate-500 uppercase mb-2 text-center border-b pb-2">
                                  {day} - P{p.period_no}
                                </div>
                                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-1">
                                  {subjects.map(sub => {
                                    const hasTeacher = assignments.some(a => a.class_id === selClass && a.section_id === selSection && a.subject_id === sub.subject_id && a.status === 'active');
                                    return (
                                      <button 
                                        key={sub.subject_id}
                                        onClick={(e) => { e.stopPropagation(); updateCell(sub.subject_id); }}
                                        className="text-left px-2 py-1.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium truncate flex justify-between items-center"
                                      >
                                        <span>{sub.subject_code}</span>
                                        {!hasTeacher && <span className="text-[10px]" title="No teacher">⚠️</span>}
                                      </button>
                                    );
                                  })}
                                </div>
                                <div className="mt-2 pt-2 border-t">
                                  <button onClick={(e) => { e.stopPropagation(); updateCell(null); }} className="w-full px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded font-medium">
                                    Clear Slot
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); setActiveCell(null); }} className="w-full px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-50 rounded mt-1">
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mr-2">Distribution:</span>
              {subjectStats.map(s => (
                <span key={s.subject_id} className="text-xs font-medium bg-white border border-slate-200 px-2 py-1 rounded shadow-sm">
                  {s.subject_code}: <span className="text-brand-primary">{s.count}</span>
                </span>
              ))}
            </div>
            <div className="text-xs font-medium text-slate-500">
              <span className="text-brand-primary font-bold">{filledSlots}</span> / {totalSlots} slots filled
            </div>
          </div>
        </div>
      )}

      {/* Clone Modal Overlay */}
      {showCloneModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-2">Clone Timetable</h2>
            <p className="text-sm text-slate-500 mb-6">
              Copy the {filledSlots} slots from <b>Class {classes.find(c=>c.class_id===selClass)?.class_label}-{selSection}</b> to other sections in the same class.
            </p>
            
            <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto">
              {getAvailableSections().filter(s => s.section_id !== selSection).map(s => (
                <label key={s.section_id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                  <input type="checkbox" 
                    checked={cloneTargets.includes(s.section_id)}
                    onChange={(e) => {
                      if (e.target.checked) setCloneTargets([...cloneTargets, s.section_id]);
                      else setCloneTargets(cloneTargets.filter(id => id !== s.section_id));
                    }}
                    className="w-5 h-5 text-brand-primary rounded focus:ring-brand-primary"
                  />
                  <span className="font-medium">Section {s.section_id}</span>
                </label>
              ))}
              {getAvailableSections().length <= 1 && (
                <div className="text-center text-slate-500 text-sm">No other sections available in this class.</div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button onClick={() => setShowCloneModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
              <button disabled={isCloning || cloneTargets.length===0} onClick={handleCloneSubmit} className="px-4 py-2 bg-brand-primary text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50">
                {isCloning ? 'Cloning...' : 'Clone to selected'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Generate Modal Overlay */}
      {showAutoGenModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><span>🪄</span> Auto-Generate Timetable</h2>
            <p className="text-sm text-slate-500 mb-6">
              Set the weekly frequency for each subject in <b>Class {classes.find(c=>c.class_id===selClass)?.class_label}-{selSection}</b>. The AI will place them based on teacher availability and best practices (Math/Sci in morning).
            </p>
            
            <div className="space-y-3 mb-6 max-h-[50vh] overflow-y-auto pr-2">
              {subjects.map(sub => {
                const count = frequencies[sub.subject_id] || 0;
                return (
                  <div key={sub.subject_id} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-slate-50">
                    <span className="font-medium text-sm text-slate-700">{sub.subject_name}</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setFrequencies({...frequencies, [sub.subject_id]: Math.max(0, count - 1)})} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 rounded-lg hover:bg-slate-100">-</button>
                      <span className="w-4 text-center font-bold">{count}</span>
                      <button onClick={() => setFrequencies({...frequencies, [sub.subject_id]: count + 1})} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 rounded-lg hover:bg-slate-100">+</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button onClick={() => setShowAutoGenModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
              <button disabled={isGenerating} onClick={handleAutoGen} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
                {isGenerating ? 'Generating...' : '✨ Generate Grid'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
