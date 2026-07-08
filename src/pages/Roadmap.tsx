import { useState, useMemo } from 'react';
import { ChapterInput, allocatePeriods, calculateAvailablePeriods } from '../lib/scheduling';
import { MOCK_TIMETABLE, MOCK_EVENTS } from '../lib/data';

const INITIAL_CHAPTERS: ChapterInput[] = [
  { no: '01', title: 'Number Systems', priority: 3 },
  { no: '02', title: 'Polynomials', priority: 3 },
  { no: '03', title: 'Coordinate Geometry', priority: 2 },
  { no: '04', title: 'Linear Equations', priority: 3 },
  { no: '05', title: 'Introduction to Euclid', priority: 1 },
  { no: '06', title: 'Lines and Angles', priority: 5 },
  { no: '07', title: 'Triangles', priority: 5 },
];

interface TopicInfo {
  no: string;
  title: string;
  weight: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

const MOCK_TOPICS_BY_CHAPTER: Record<string, TopicInfo[]> = {
  '01': [
    { no: '1.1', title: 'Irrational Numbers Concept', weight: 1.0, difficulty: 'Easy' },
    { no: '1.2', title: 'Real Numbers and Decimal Expansions', weight: 1.5, difficulty: 'Medium' },
    { no: '1.3', title: 'Representing Real Numbers on Number Line', weight: 1.0, difficulty: 'Easy' },
    { no: '1.4', title: 'Operations on Real Numbers & Rationalisation', weight: 2.0, difficulty: 'Hard' },
    { no: '1.5', title: 'Laws of Exponents for Real Numbers', weight: 1.0, difficulty: 'Medium' }
  ],
  '02': [
    { no: '2.1', title: 'Polynomials in One Variable', weight: 1.0, difficulty: 'Easy' },
    { no: '2.2', title: 'Zeroes of a Polynomial', weight: 1.5, difficulty: 'Medium' },
    { no: '2.3', title: 'Remainder Theorem', weight: 2.0, difficulty: 'Hard' },
    { no: '2.4', title: 'Factorisation of Polynomials', weight: 2.5, difficulty: 'Hard' },
    { no: '2.5', title: 'Algebraic Identities and Applications', weight: 3.0, difficulty: 'Hard' }
  ],
  '03': [
    { no: '3.1', title: 'Cartesian System & Coordinate Plane', weight: 1.0, difficulty: 'Easy' },
    { no: '3.2', title: 'Plotting a Point in the Plane with Given Coordinates', weight: 1.5, difficulty: 'Medium' }
  ],
  '04': [
    { no: '4.1', title: 'Linear Equations Intro', weight: 1.0, difficulty: 'Easy' },
    { no: '4.2', title: 'Solution of a Linear Equation', weight: 1.5, difficulty: 'Medium' },
    { no: '4.3', title: 'Graph of a Linear Equation in Two Variables', weight: 2.0, difficulty: 'Hard' },
    { no: '4.4', title: 'Equations of Lines Parallel to x-axis and y-axis', weight: 1.0, difficulty: 'Easy' }
  ],
  '05': [
    { no: '5.1', title: 'Euclids Definitions, Axioms and Postulates', weight: 1.0, difficulty: 'Easy' },
    { no: '5.2', title: 'Equivalent Versions of Euclids Fifth Postulate', weight: 1.5, difficulty: 'Medium' }
  ],
  '06': [
    { no: '6.1', title: 'Basic Terms and Definitions', weight: 1.0, difficulty: 'Easy' },
    { no: '6.2', title: 'Intersecting Lines and Non-intersecting Lines', weight: 0.8, difficulty: 'Easy' },
    { no: '6.3', title: 'Pairs of Angles & Linear Pair Axiom', weight: 1.5, difficulty: 'Medium' },
    { no: '6.4', title: 'Parallel Lines and a Transversal', weight: 2.0, difficulty: 'Hard' },
    { no: '6.5', title: 'Lines Parallel to the Same Line', weight: 1.0, difficulty: 'Medium' },
    { no: '6.6', title: 'Angle Sum Property of a Triangle', weight: 1.8, difficulty: 'Hard' }
  ],
  '07': [
    { no: '7.1', title: 'Congruence of Triangles Concept', weight: 1.0, difficulty: 'Easy' },
    { no: '7.2', title: 'Criteria for Congruence of Triangles (SAS, ASA)', weight: 2.5, difficulty: 'Hard' },
    { no: '7.3', title: 'Properties of an Isosceles Triangle', weight: 1.5, difficulty: 'Medium' },
    { no: '7.4', title: 'More Congruence Rules (SSS, RHS)', weight: 2.0, difficulty: 'Hard' },
    { no: '7.5', title: 'Inequalities in a Triangle', weight: 1.5, difficulty: 'Hard' }
  ]
};

export function YearlyRoadmap() {
  // State for Settings Panel
  const [targetClass, setTargetClass] = useState('10-B');
  const [targetSubject, setTargetSubject] = useState('Mathematics');
  const [termStart] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [termEnd, setTermEnd] = useState('2025-02-28'); // default target date
  
  const [chapters, setChapters] = useState<ChapterInput[]>(INITIAL_CHAPTERS);
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);

  // Auto-calculate available periods from the timetable
  const totalAvailablePeriods = useMemo(() => {
    return calculateAvailablePeriods(
      MOCK_TIMETABLE,
      MOCK_EVENTS,
      new Date(termStart),
      new Date(termEnd),
      targetClass,
      targetClass.split('-')[1] || '',
      targetSubject
    );
  }, [termStart, termEnd, targetClass, targetSubject]);

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

  // Prevent unreasonably low dates (e.g., must be at least 1 month from now)
  const minDate = useMemo(() => {
    const d = new Date(termStart);
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  }, [termStart]);

  return (
    <div className="space-y-6 max-w-[1200px] p-4 lg:p-6 mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-slate-800">Yearly Teaching Roadmap</h1>
        <p className="text-slate-500">Configure available periods and customize chapter priorities. Expand chapters to view dynamic topic-level allocations.</p>
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
                  <option value="10-B">Class 10-B</option>
                  <option value="9-C">Class 9-C</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-slate-700">
                Subject
                <select 
                  value={targetSubject} 
                  onChange={(e) => setTargetSubject(e.target.value)}
                  className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none"
                >
                  <option value="Mathematics">Mathematics</option>
                  <option value="Science">Science</option>
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
            Within a chapter, topics are weighted proportionally (e.g. 1.0x vs 2.5x). Topic periods scale automatically to exactly fit the chapter allocation.
          </div>
        </div>

        {/* Allocation Table */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-[13px] font-semibold text-slate-900 uppercase tracking-wider">Chapter & Topic Distribution</h2>
              <span className="text-[11px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded">
                Live Weight Scaling Active
              </span>
            </div>
            
            <div className="divide-y divide-slate-100">
              {allocations.map((ch, idx) => {
                const isExpanded = expandedChapter === ch.no;
                const topics = MOCK_TOPICS_BY_CHAPTER[ch.no] || [];
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

            {totalAvailablePeriods <= 0 && (
              <div className="p-12 text-center text-slate-400">
                No teaching periods found for this class between the selected dates.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
