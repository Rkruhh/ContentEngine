/** Minimal markdown → HTML for headings, lists, code, and paragraphs. */
export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let inCode = false;
  let codeBuf: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  const escape = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const inline = (s: string) =>
    escape(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        html.push(`<pre><code>${escape(codeBuf.join("\n"))}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else {
        flushList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    if (/^#{1,3}\s/.test(line)) {
      flushList();
      const level = line.match(/^#+/)?.[0].length ?? 1;
      const text = line.replace(/^#{1,3}\s+/, "");
      html.push(`<h${level}>${inline(text)}</h${level}>`);
      continue;
    }

    const ul = line.match(/^\s*[-*]\s+(.+)$/);
    const ol = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ul || ol) {
      const next = ul ? "ul" : "ol";
      const item = (ul?.[1] ?? ol?.[1]) as string;
      if (listType !== next) {
        flushList();
        listType = next;
        html.push(`<${next}>`);
      }
      html.push(`<li>${inline(item)}</li>`);
      continue;
    }

    if (line.trim() === "") {
      flushList();
      continue;
    }

    if (line.startsWith("> ")) {
      flushList();
      html.push(`<blockquote><p>${inline(line.slice(2))}</p></blockquote>`);
      continue;
    }

    flushList();
    html.push(`<p>${inline(line)}</p>`);
  }

  if (inCode) {
    html.push(`<pre><code>${escape(codeBuf.join("\n"))}</code></pre>`);
  }
  flushList();
  return html.join("\n");
}
