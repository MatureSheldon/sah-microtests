import { useState, useMemo, useEffect } from 'react';
import { ChapterInput, allocatePeriods, calculateAvailablePeriods } from '../lib/scheduling';
import { MOCK_TIMETABLE, MOCK_EVENTS } from '../lib/gateway-mock';
import { useTeacher } from '../components/TeacherContext';
import { getTeacherAssignments, getSubjectOutline, saveRoadmapPlan, getAllTimetableSlots } from '../lib/gateway';
import type { TeacherAssignment, SubjectOutline } from '../lib/models';
import type { TimetableEntry } from '../lib/scheduling';

interface TopicInfo {
  no: string;
  topic_id: string;
  title: string;
  weight: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export function YearlyRoadmap() {
  const { teacher } = useTeacher();
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [targetClass, setTargetClass] = useState('');
  const [targetSubject, setTargetSubject] = useState('');
  
  const [termStart] = useState(() => new Date().toISOString().split('T')[0]);
  const [termEnd, setTermEnd] = useState('2025-02-28'); // default target date
  
  const [outline, setOutline] = useState<SubjectOutline | null>(null);
  const [loading, setLoading] = useState(false);
  const [allSlots, setAllSlots] = useState<any[]>([]);
  
  const [chapters, setChapters] = useState<ChapterInput[]>([]);
  const [topicsByChapter, setTopicsByChapter] = useState<Record<string, TopicInfo[]>>({});
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // 1. Load assignments and timetable on mount
  useEffect(() => {
    if (!teacher) return;
    
    // Load timetable
    getAllTimetableSlots().then(res => {
      if (res && res.ok && res.slots) {
        setAllSlots(res.slots);
      }
    });

    getTeacherAssignments(teacher.teacher_id).then(data => {
      setAssignments(data);
      if (data.length > 0) {
        setTargetClass(data[0].class_id);
        setTargetSubject(data[0].subject_id);
      }
    });
  }, [teacher]);

  // 2. Class/Subject changes -> Load Outline
  useEffect(() => {
    if (!targetClass || !targetSubject) return;
    setLoading(true);
    setSaveMessage('');
    
    getSubjectOutline(targetClass, targetSubject)
      .then(data => {
        setOutline(data);
        if (data && data.chapters) {
          // Build initial state for the planner
          const initialChapters: ChapterInput[] = [];
          const initialTopics: Record<string, TopicInfo[]> = {};
          
          data.chapters.forEach(ch => {
            // Default priority based roughly on total periods, min 1, max 5
            const priority = Math.max(1, Math.min(5, Math.ceil(ch.total_periods / 3))) || 3;
            initialChapters.push({
              no: String(ch.chapter_no).padStart(2, '0'),
              title: ch.chapter_title,
              priority
            });
            
            initialTopics[String(ch.chapter_no).padStart(2, '0')] = ch.topics.map(t => ({
              no: `${ch.chapter_no}.${t.sequence_no}`,
              topic_id: t.topic_id,
              title: t.topic_title,
              weight: t.planned_periods || 1.0,
              difficulty: 'Medium' // Mocked for now, not in DB
            }));
          });
          
          setChapters(initialChapters);
          setTopicsByChapter(initialTopics);
        }
      })
      .finally(() => setLoading(false));
  }, [targetClass, targetSubject]);

  // Unique class IDs for the selector
  const availableClasses = Array.from(new Set(assignments.map(a => a.class_id))).sort();
  const availableSubjects = assignments
    .filter(a => a.class_id === targetClass)
    .map(a => a.subject_id);

  // Auto-pick first subject when class changes
  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.includes(targetSubject)) {
      setTargetSubject(availableSubjects[0]);
    }
  }, [targetClass, availableSubjects, targetSubject]);

  // Auto-calculate available periods from the timetable
  const totalAvailablePeriods = useMemo(() => {
    if (allSlots.length === 0 || !targetClass || !targetSubject) return 120; // Fallback

    // Convert backend slots to TimetableEntry format
    const realTimetable: TimetableEntry[] = allSlots
      .filter(s => s.slot_type === 'instructional')
      .map(s => ({
        day: s.day,
        period: s.period_no,
        periodStart: s.start_time,
        periodEnd: s.end_time,
        klass: s.class_id,
        section: s.section_id,
        subject: s.subject_id,
        teacher: s.teacher_id,
      }));

    // The backend uses things like "CLASS_8" and "A". We need to map `targetClass` (e.g. "CLASS_8") directly.
    // However, our UI right now only selects `targetClass`, not a section! 
    // Wait, let's just sum across all sections for the class, or assume section A for the roadmap?
    // Usually Roadmap is per class, so if they have 3 sections, they might have 3x periods. Let's just calculate for Section 'A' for baseline.
    const calculated = calculateAvailablePeriods(
      realTimetable,
      MOCK_EVENTS,
      new Date(termStart),
      new Date(termEnd),
      targetClass,
      '', // No specific section, averages across all sections for this class
      targetSubject
    );
    
    return calculated > 0 ? calculated : 120;
  }, [termStart, termEnd, targetClass, targetSubject, allSlots]);

  // Auto-allocate periods based on available total and priorities
  const allocations = useMemo(() => {
    if (totalAvailablePeriods <= 0) return chapters.map(ch => ({ ...ch, allocatedPeriods: 0 }));
    return allocatePeriods(chapters, totalAvailablePeriods, 0.10); // 10% buffer
  }, [chapters, totalAvailablePeriods]);

  const updatePriority = (idx: number, priority: number) => {
    const newChapters = [...chapters];
    newChapters[idx].priority = priority;
    setChapters(newChapters);
  };

  const toggleExpand = (chNo: string) => {
    setExpandedChapter(expandedChapter === chNo ? null : chNo);
  };

  const handleSavePlan = async () => {
    if (!targetClass || !targetSubject || allocations.length === 0) return;
    
    setSaving(true);
    setSaveMessage('');
    
    try {
      // Build the plan_data object: { topic_id: calculated_periods }
      const planData: Record<string, number> = {};
      
      allocations.forEach(ch => {
        const topics = topicsByChapter[ch.no] || [];
        const totalTopicWeight = topics.reduce((sum, t) => sum + t.weight, 0) || 1.0;
        
        topics.forEach(t => {
          const calcPeriods = (t.weight / totalTopicWeight) * ch.allocatedPeriods;
          planData[t.topic_id] = calcPeriods;
        });
      });
      
      const res = await saveRoadmapPlan(targetClass, targetSubject, planData);
      if (res.ok) {
        setSaveMessage('Plan saved successfully!');
      } else {
        setSaveMessage('Failed to save: ' + (res.error || 'Unknown error'));
      }
    } catch (err) {
      setSaveMessage('Error saving plan.');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const minDate = useMemo(() => {
    const d = new Date(termStart);
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  }, [termStart]);

  return (
    <div className="space-y-6 max-w-[1200px] p-4 lg:p-6 mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-slate-800">Yearly Teaching Roadmap</h1>
          <p className="text-slate-500">Configure available periods and customize chapter priorities.</p>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span className={`text-sm font-semibold ${saveMessage.includes('Error') || saveMessage.includes('Failed') ? 'text-rose-500' : 'text-emerald-500'}`}>
              {saveMessage}
            </span>
          )}
          <button
            onClick={handleSavePlan}
            disabled={saving || allocations.length === 0}
            className="px-5 py-2.5 bg-brand-primary text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : '💾 Save Plan'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              Plan Settings
            </h2>
            
            <div className="space-y-4">
              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-slate-700">
                Class / Section
                <select 
                  value={targetClass} 
                  onChange={(e) => setTargetClass(e.target.value)}
                  className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none"
                >
                  {availableClasses.map(c => (
                    <option key={c} value={c}>{c.replace('CLASS_', 'Class ')}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-slate-700">
                Subject
                <select 
                  value={targetSubject} 
                  onChange={(e) => setTargetSubject(e.target.value)}
                  className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none"
                >
                  {availableSubjects.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-slate-700">
                Target Completion Date
                <input 
                  type="date"
                  min={minDate}
                  value={termEnd}
                  onChange={(e) => setTermEnd(e.target.value)}
                  className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none font-mono text-sm"
                />
                <span className="text-[11px] text-slate-400">Must be at least 1 month from today.</span>
              </label>
            </div>

            <div className="mt-8 p-4 bg-brand-accent/5 rounded-xl border border-brand-accent/20 flex flex-col items-center justify-center">
              <span className="text-[11px] font-bold text-brand-accent uppercase tracking-widest mb-1">Available Periods</span>
              <span className="text-4xl font-black text-brand-primary tracking-tight">
                {totalAvailablePeriods}
              </span>
              <span className="text-[10px] text-slate-400 mt-2 text-center">
                Calculated from timetable, minus holidays & exams. 10% buffer reserved.
              </span>
            </div>
          </div>

          <div className="p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-100 text-xs leading-relaxed shadow-sm">
            <strong className="text-blue-900 block mb-1 uppercase tracking-wider text-[11px]">Dynamic Topic Pacing (Option A)</strong>
            Every chapter has a relative priority. Changing priority adjusts the chapter allocation. 
            <br/><br/>
            Within a chapter, topics are weighted proportionally. When you save, topics will have their `planned_periods` updated.
          </div>
        </div>

        {/* Allocation Table */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm min-h-[400px]">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-[13px] font-semibold text-slate-900 uppercase tracking-wider">Chapter & Topic Distribution</h2>
              <span className="text-[11px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded">
                Live Weight Scaling Active
              </span>
            </div>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-brand-accent border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Loading Curriculum...</p>
              </div>
            ) : allocations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-slate-500 font-medium mb-2">No chapters found</p>
                <p className="text-sm text-slate-400">Please select a different class or subject.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {allocations.map((ch, idx) => {
                  const isExpanded = expandedChapter === ch.no;
                  const topics = topicsByChapter[ch.no] || [];
                  const totalTopicWeight = topics.reduce((sum, t) => sum + t.weight, 0) || 1.0;

                  return (
                    <div key={ch.no} className="transition-colors">
                      
                      {/* Chapter Row */}
                      <div 
                        className={`flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50/70 border-l-4 border-brand-accent' : ''}`}
                        onClick={() => toggleExpand(ch.no)}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs transition-colors ${isExpanded ? 'bg-brand-accent text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {ch.no}
                          </span>
                          <div>
                            <span className="font-bold text-slate-800 text-sm block">{ch.title}</span>
                            <span className="text-[11px] text-slate-400">{topics.length} topics • {totalTopicWeight.toFixed(1)}x total weight</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="1"
                              max="5"
                              step="1"
                              value={ch.priority}
                              onChange={(e) => updatePriority(idx, Number(e.target.value))}
                              className="w-20 lg:w-24 accent-brand-accent cursor-pointer"
                            />
                            <span className="font-bold w-5 text-center text-brand-primary bg-white border border-slate-200 rounded text-[11px] py-0.5 shadow-sm">
                              {ch.priority}
                            </span>
                          </div>
                          
                          <div className="text-right min-w-[70px]">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md font-extrabold text-xs shadow-sm">
                              {ch.allocatedPeriods} per
                            </span>
                          </div>
                          
                          <button 
                            onClick={() => toggleExpand(ch.no)}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              className={`h-5 w-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                              viewBox="0 0 20 20" 
                              fill="currentColor"
                            >
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Expandable Topic Sub-table */}
                      {isExpanded && (
                        <div className="bg-slate-50/50 border-t border-b border-slate-100 px-8 py-4 animate-in slide-in-from-top-2 duration-200">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
                                <th className="py-2">Seq</th>
                                <th className="py-2">Topic Map Details</th>
                                <th className="py-2 text-center">Difficulty</th>
                                <th className="py-2 text-center">Relative Weight</th>
                                <th className="py-2 text-right">Calculated Target</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {topics.map((t) => {
                                const calcPeriods = ((t.weight / totalTopicWeight) * ch.allocatedPeriods).toFixed(1);
                                return (
                                  <tr key={t.no} className="hover:bg-slate-100/40 transition-colors">
                                    <td className="py-3 font-mono font-semibold text-slate-500">{t.no}</td>
                                    <td className="py-3 font-medium text-slate-700">{t.title}</td>
                                    <td className="py-3 text-center">
                                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                        t.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                        t.difficulty === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                        'bg-rose-50 text-rose-600 border border-rose-100'
                                      }`}>
                                        {t.difficulty}
                                      </span>
                                    </td>
                                    <td className="py-3 text-center font-mono text-slate-500 font-bold">{t.weight.toFixed(1)}x</td>
                                    <td className="py-3 text-right">
                                      <span className="inline-flex px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded border border-blue-100">
                                        {calcPeriods} periods
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
