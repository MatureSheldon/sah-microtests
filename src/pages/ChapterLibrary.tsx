import { useState } from 'react';
import { MOCK_LESSON_PLANS } from '../lib/data';
import { Link } from 'react-router-dom';

export function ChapterLibrary() {
  const [selectedClass, setSelectedClass] = useState('10');
  const [selectedSubject, setSelectedSubject] = useState('Mathematics');

  const classes = ['8', '9', '10', '12'];
  const subjects = ['Mathematics', 'Science', 'English', 'Applied Maths'];

  // For dummy data, we'll just show the same items or filter if it matches our mock
  const plans = Object.values(MOCK_LESSON_PLANS).filter(
    (p) => p.klass === selectedClass && p.subject === selectedSubject
  );

  return (
    <div className="max-w-[1600px] w-full p-4 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Chapter Library</h1>
          <p className="text-slate-500 mt-1">Browse lesson plans, action plans, and resources.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
          <select 
            value={selectedClass} 
            onChange={(e) => setSelectedClass(e.target.value)}
            className="bg-slate-50 border-none text-sm font-semibold py-2 px-4 rounded-lg outline-none cursor-pointer focus:ring-2 focus:ring-brand-accent/20"
          >
            {classes.map(c => <option key={c} value={c}>Class {c}</option>)}
          </select>
          <select 
            value={selectedSubject} 
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-slate-50 border-none text-sm font-semibold py-2 px-4 rounded-lg outline-none cursor-pointer focus:ring-2 focus:ring-brand-accent/20"
          >
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </header>

      {plans.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
          <p className="text-slate-500">No lesson plans found for Class {selectedClass} {selectedSubject}.</p>
          <p className="text-sm text-slate-400 mt-2">Check back later or try Class 10 Mathematics for a demo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Link key={plan.id} to={`/chapters/${plan.id}`} className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col h-full hover:border-brand-accent/30">
              <div className="flex items-start justify-between mb-4">
                <span className="text-xs font-bold px-2 py-1 bg-brand-accent/10 text-brand-accent rounded">
                  {plan.duration}
                </span>
                <span className="text-xs font-bold text-slate-400">CLASS {plan.klass}</span>
              </div>
              <h3 className="text-xl font-bold mb-2 text-slate-800">{plan.chapterTitle}</h3>
              <p className="text-sm text-slate-500 line-clamp-2 mb-6 flex-1">
                {plan.objectives[0]}
              </p>
              
              <div className="flex gap-2 mt-auto">
                <button className="flex-1 py-2 bg-slate-50 border border-slate-200 text-brand-primary text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors">
                  View Plan
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
