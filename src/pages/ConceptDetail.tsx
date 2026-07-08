import { useId, useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { getConcept } from '../lib/gateway';
import { renderMarkdownToHtml, renderMath } from '../lib/utils';
import type { Concept } from '../lib/models';

let mermaidReady: Promise<typeof import('mermaid').default> | null = null;

function loadMermaid() {
  if (!mermaidReady) {
    mermaidReady = import('mermaid').then((module) => {
      module.default.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        themeVariables: {
          primaryColor: '#EFF6FF',
          primaryBorderColor: '#2563EB',
          primaryTextColor: '#1E293B',
          lineColor: '#64748B',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        },
      });
      return module.default;
    });
  }
  return mermaidReady;
}

function MermaidDiagram({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, '');
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function renderDiagram() {
      try {
        setError('');
        const mermaid = await loadMermaid();
        const { svg: renderedSvg } = await mermaid.render(`concept-mermaid-${id}`, chart);
        if (!cancelled) setSvg(renderedSvg);
      } catch (err) {
        if (!cancelled) {
          setSvg('');
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    }
    renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (error) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Mermaid diagram could not be rendered. Check the diagram syntax in the Concepts sheet.
        </div>
        <pre className="p-4 bg-slate-50 font-mono text-xs rounded-xl border border-slate-200 whitespace-pre-wrap overflow-x-auto">
          {chart}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return <div className="text-sm text-slate-400">Rendering diagram...</div>;
  }

  return (
    <div
      className="mermaid-diagram w-full overflow-x-auto [&_svg]:mx-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function ConceptVisual({ concept }: { concept: Concept }) {
  const visualType = String(concept.visual_type || '').trim().toLowerCase();
  const visualData = concept.visual_data || '';

  if (visualType === 'svg') {
    return (
      <div
        className="w-full flex justify-center p-4 border border-dashed border-slate-200 rounded-xl overflow-x-auto bg-slate-50"
        dangerouslySetInnerHTML={{ __html: visualData }}
      />
    );
  }

  if (visualType === 'mermaid') {
    return (
      <div className="w-full p-4 border border-dashed border-slate-200 rounded-xl overflow-x-auto bg-slate-50">
        <MermaidDiagram chart={visualData} />
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-50 font-mono text-xs rounded-xl border border-slate-200 whitespace-pre-wrap overflow-x-auto">
      {visualData}
    </div>
  );
}

export function ConceptDetail() {
  const { conceptId } = useParams(); // conceptId is actually topicId
  const [searchParams] = useSearchParams();
  const classId = searchParams.get('classId') || 'CLASS_9';
  const subjectId = searchParams.get('subjectId') || 'MATH';

  const [concept, setConcept] = useState<Concept | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConcept() {
      try {
        setLoading(true);
        const data = await getConcept(classId, subjectId, conceptId || '');
        setConcept(data);
      } catch (err) {
        console.error("Failed to load concept details:", err);
      } finally {
        setLoading(false);
      }
    }
    loadConcept();
  }, [classId, subjectId, conceptId]);

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-brand-accent border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Loading concept explanation...</p>
      </div>
    );
  }

  if (!concept) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-slate-800">Concept not found</h2>
        <Link to="/" className="text-brand-accent hover:underline mt-2 inline-block">
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] w-full p-4 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 mx-auto">
      {/* Header */}
      <header className="mb-8 print:hidden">
        <Link to="/" className="text-sm font-semibold text-brand-accent hover:underline flex items-center gap-1 mb-6 inline-flex">
          &larr; Back to Dashboard
        </Link>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold px-2 py-1 bg-brand-accent/10 text-brand-accent rounded">
              CONCEPT MAP
            </span>
            <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded font-mono">
              {conceptId}
            </span>
          </div>
          <h1 className="text-4xl font-bold text-slate-800 tracking-tight">{concept.title}</h1>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="space-y-6">
        
        {/* Core Concept Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 lg:p-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-blue-500">📖</span> Explanation
          </h2>
          <div 
            className="text-slate-600 leading-relaxed text-sm space-y-4"
            dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(concept.explanation) }}
          />
        </div>

        {/* Formulas Card */}
        {concept.key_formulas && concept.key_formulas.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl shadow-sm p-6 lg:p-8">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-200/55 pb-2">
              <span className="text-brand-accent">🧮</span> Key Formulas & Relations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {concept.key_formulas.map((formula, idx) => (
                <div 
                  key={idx} 
                  className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-center min-h-[80px]"
                >
                  <div 
                    className="text-base text-brand-primary overflow-x-auto w-full text-center"
                    dangerouslySetInnerHTML={{ __html: renderMath(`\\[${formula}\\]`) }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Visual Map/Diagram Card */}
        {concept.visual_data && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 lg:p-8">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="text-indigo-500">🎨</span> Visual Mapping
            </h2>
            <ConceptVisual concept={concept} />
          </div>
        )}

        {/* Misconceptions Card */}
        {concept.misconceptions && concept.misconceptions.length > 0 && (
          <div className="bg-rose-50/50 border border-rose-100 rounded-2xl shadow-sm p-6 lg:p-8">
            <h2 className="text-lg font-bold text-rose-800 mb-4 flex items-center gap-2 border-b border-rose-100 pb-2">
              <span className="text-rose-500">⚠️</span> Common Misconceptions & Pitfalls
            </h2>
            <ul className="space-y-4">
              {concept.misconceptions.map((mis, idx) => (
                <li key={idx} className="flex gap-3 bg-white p-4 rounded-xl border border-rose-100 shadow-sm">
                  <span className="text-rose-500 font-bold text-lg select-none">✕</span>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">Misconception {idx + 1}</h4>
                    <p className="text-slate-600 text-sm leading-relaxed">{mis}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}
