import { KNOWLEDGE_LIMITS } from "./types";

export type ChunkerOptions = {
  chunkSize?: number;
  chunkOverlap?: number;
};

/**
 * Structure-aware chunker: prefer markdown headings, fenced code, paragraphs.
 */
export function chunkText(
  text: string,
  options: ChunkerOptions = {},
): string[] {
  const chunkSize = options.chunkSize ?? KNOWLEDGE_LIMITS.chunkSize;
  const overlap = options.chunkOverlap ?? KNOWLEDGE_LIMITS.chunkOverlap;
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const units = splitIntoUnits(normalized);
  const chunks: string[] = [];
  let buffer = "";

  const flush = () => {
    const trimmed = buffer.trim();
    if (trimmed) chunks.push(trimmed);
    buffer = "";
  };

  for (const unit of units) {
    if (unit.length > chunkSize) {
      flush();
      for (const piece of hardSplit(unit, chunkSize, overlap)) {
        chunks.push(piece);
      }
      continue;
    }
    if (!buffer) {
      buffer = unit;
      continue;
    }
    if (`${buffer}\n\n${unit}`.length <= chunkSize) {
      buffer = `${buffer}\n\n${unit}`;
    } else {
      flush();
      // overlap: keep tail of previous chunk if useful
      const prev = chunks[chunks.length - 1];
      if (prev && overlap > 0) {
        const tail = prev.slice(Math.max(0, prev.length - overlap));
        buffer = `${tail}\n\n${unit}`.trim();
      } else {
        buffer = unit;
      }
    }
  }
  flush();

  return chunks.slice(0, KNOWLEDGE_LIMITS.maxChunksPerSource);
}

function splitIntoUnits(text: string): string[] {
  const units: string[] = [];
  const lines = text.split("\n");
  let i = 0;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      units.push(para.join("\n").trim());
      para = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i]!;

    if (line.startsWith("```")) {
      flushPara();
      const fence = [line];
      i += 1;
      while (i < lines.length && !lines[i]!.startsWith("```")) {
        fence.push(lines[i]!);
        i += 1;
      }
      if (i < lines.length) fence.push(lines[i]!);
      units.push(fence.join("\n"));
      i += 1;
      continue;
    }

    if (/^#{1,6}\s+/.test(line)) {
      flushPara();
      units.push(line.trim());
      i += 1;
      continue;
    }

    if (line.trim() === "") {
      flushPara();
      i += 1;
      continue;
    }

    para.push(line);
    i += 1;
  }
  flushPara();
  return units.filter(Boolean);
}

function hardSplit(text: string, size: number, overlap: number): string[] {
  const out: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(text.length, start + size);
    out.push(text.slice(start, end));
    if (end >= text.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return out;
}
