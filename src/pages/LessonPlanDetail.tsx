import { useParams, Link } from 'react-router-dom';
import { MOCK_LESSON_PLANS } from '../lib/data';

export function LessonPlanDetail() {
  const { planId } = useParams();
  const plan = MOCK_LESSON_PLANS[planId || ''];

  if (!plan) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-slate-800">Plan not found</h2>
        <Link to="/chapters" className="text-brand-accent hover:underline mt-2 inline-block">
          &larr; Back to Library
        </Link>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-[1000px] w-full p-4 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 mx-auto">
      {/* Header */}
      <header className="mb-8 print:hidden">
        <Link to="/chapters" className="text-sm font-semibold text-brand-accent hover:underline flex items-center gap-1 mb-6 inline-flex">
          &larr; Back to Library
        </Link>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-bold px-2 py-1 bg-brand-accent/10 text-brand-accent rounded">
                CLASS {plan.klass}
              </span>
              <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded">
                {plan.subject}
              </span>
              <span className="text-xs font-bold px-2 py-1 bg-amber-100 text-amber-700 rounded">
                {plan.duration}
              </span>
            </div>
            <h1 className="text-4xl font-bold text-slate-800 tracking-tight">{plan.chapterTitle}</h1>
            <p className="text-slate-500 mt-2">5E Instructional Lesson Plan</p>
          </div>
          <button 
            onClick={handlePrint}
            className="px-4 py-2 bg-brand-primary text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
          >
            Export PDF
          </button>
        </div>
      </header>

      {/* Printable Area */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 print:shadow-none print:border-none print:p-0">
        <div className="hidden print:block mb-8 border-b-2 border-slate-800 pb-4">
          <h1 className="text-3xl font-bold text-slate-800">{plan.chapterTitle}</h1>
          <p className="text-sm text-slate-600 font-medium mt-1">
            Class {plan.klass} • {plan.subject} • {plan.duration}
          </p>
        </div>

        {/* Objectives */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm">🎯</span>
            Learning Objectives
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            {plan.objectives.map((obj, i) => (
              <li key={i}>{obj}</li>
            ))}
          </ul>
        </section>

        {/* 5E Phases */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">📖</span>
            5E Instructional Flow
          </h2>
          <div className="space-y-6">
            <PhaseCard title="1. Engage" color="bg-rose-50 border-rose-200 text-rose-800" content={plan.phases.engage} />
            <PhaseCard title="2. Explore" color="bg-amber-50 border-amber-200 text-amber-800" content={plan.phases.explore} />
            <PhaseCard title="3. Explain" color="bg-blue-50 border-blue-200 text-blue-800" content={plan.phases.explain} />
            <PhaseCard title="4. Elaborate" color="bg-indigo-50 border-indigo-200 text-indigo-800" content={plan.phases.elaborate} />
            <PhaseCard title="5. Evaluate" color="bg-emerald-50 border-emerald-200 text-emerald-800" content={plan.phases.evaluate} />
          </div>
        </section>

        {/* Resources */}
        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-sm">📎</span>
            Required Resources
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            {plan.resources.map((res, i) => (
              <li key={i}>{res}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function PhaseCard({ title, content, color }: { title: string; content: string; color: string }) {
  return (
    <div className={`p-5 rounded-xl border ${color}`}>
      <h3 className="font-bold mb-2 text-inherit">{title}</h3>
      <p className="text-sm opacity-90 leading-relaxed text-slate-700">{content}</p>
    </div>
  );
}
