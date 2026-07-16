import { useId, useState, useEffect } from 'react';

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

export function MermaidDiagram({ chart }: { chart: string }) {
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
    if (chart) renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (error) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Mermaid diagram could not be rendered.
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
