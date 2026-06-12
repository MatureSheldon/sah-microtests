import katex from 'katex';

export function renderMath(text: string): string {
  return String(text || "")
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, expr) => {
      try { return katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false }); }
      catch (e) { return _; }
    })
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, expr) => {
      try { return katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false }); }
      catch (e) { return _; }
    });
}

export function renderMarkdownToHtml(text: string): string {
  const escaped = String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
  return renderMath(escaped);
}
