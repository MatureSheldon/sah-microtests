import { useEffect, useState } from 'react';

// Basic markdown without katex
export function renderBasicMarkdown(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}

let katexPromise: Promise<typeof import('katex').default> | null = null;

function loadKatex() {
  if (!katexPromise) {
    katexPromise = Promise.all([
      import('katex'),
      import('katex/dist/katex.min.css')
    ]).then(([module]) => module.default);
  }
  return katexPromise;
}

export function renderMathWithKatex(text: string, katex: any): string {
  return text
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, expr) => {
      try { return katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false }); }
      catch (e) { return _; }
    })
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, expr) => {
      try { return katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false }); }
      catch (e) { return _; }
    });
}

export function Markdown({ text, as: Component = 'div', className = '' }: { text: string, as?: 'div' | 'span', className?: string }) {
  const [html, setHtml] = useState(() => renderBasicMarkdown(text));

  useEffect(() => {
    const basicHtml = renderBasicMarkdown(text);
    if (basicHtml.includes('\\[') || basicHtml.includes('\\(')) {
      loadKatex().then(katex => {
        setHtml(renderMathWithKatex(basicHtml, katex));
      });
    } else {
      setHtml(basicHtml);
    }
  }, [text]);

  return <Component className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
