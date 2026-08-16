/**
 * Deterministic document diff for edit learning.
 * Does not infer preferences — only structured change context.
 */

export type DiffSectionChange = {
  kind: "added" | "removed" | "modified";
  text: string;
};

export type DiffResult = {
  addedText: string[];
  removedText: string[];
  modifiedSections: DiffSectionChange[];
  changedParagraphs: number;
  changedHeadings: number;
  changedCodeBlocks: number;
  /** 0–1 fraction of content that changed (by normalized chars). */
  changeRatio: number;
  addedCharCount: number;
  removedCharCount: number;
  /** Approximate non-whitespace chars changed. */
  changedCharCount: number;
  identical: boolean;
};

export type MeaningfulEditThresholds = {
  minChangedChars: number;
  minChangeRatio: number;
  minChangedParagraphs: number;
};

export const DEFAULT_MEANINGFUL_THRESHOLDS: MeaningfulEditThresholds = {
  minChangedChars: 40,
  minChangeRatio: 0.02,
  minChangedParagraphs: 1,
};

function normalizeForCompare(text: string): string {
  return text.replace(/\r\n/g, "\n").trim();
}

function stripTrivial(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim()
    .toLowerCase();
}

function splitParagraphs(text: string): string[] {
  return normalizeForCompare(text)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function isHeading(line: string): boolean {
  return /^#{1,6}\s+\S/.test(line.trim());
}

function isCodeFence(line: string): boolean {
  return line.trim().startsWith("```");
}

function extractHeadings(text: string): string[] {
  return normalizeForCompare(text)
    .split("\n")
    .filter(isHeading)
    .map((l) => l.trim());
}

function extractCodeBlocks(text: string): string[] {
  const blocks: string[] = [];
  const lines = normalizeForCompare(text).split("\n");
  let i = 0;
  while (i < lines.length) {
    if (!isCodeFence(lines[i] ?? "")) {
      i += 1;
      continue;
    }
    const start = i;
    i += 1;
    while (i < lines.length && !isCodeFence(lines[i] ?? "")) i += 1;
    blocks.push(lines.slice(start, i + 1).join("\n"));
    i += 1;
  }
  return blocks;
}

function setDiff(a: string[], b: string[]): { added: string[]; removed: string[] } {
  const aSet = new Set(a.map((x) => x.trim()).filter(Boolean));
  const bSet = new Set(b.map((x) => x.trim()).filter(Boolean));
  const added = [...bSet].filter((x) => !aSet.has(x));
  const removed = [...aSet].filter((x) => !bSet.has(x));
  return { added, removed };
}

/**
 * Compare original vs edited markdown/text.
 */
export function compareDocuments(original: string, edited: string): DiffResult {
  const orig = normalizeForCompare(original);
  const next = normalizeForCompare(edited);

  if (orig === next) {
    return {
      addedText: [],
      removedText: [],
      modifiedSections: [],
      changedParagraphs: 0,
      changedHeadings: 0,
      changedCodeBlocks: 0,
      changeRatio: 0,
      addedCharCount: 0,
      removedCharCount: 0,
      changedCharCount: 0,
      identical: true,
    };
  }

  // Pure whitespace / punctuation-only → treat as trivial identical for learning
  if (stripTrivial(orig) === stripTrivial(next)) {
    return {
      addedText: [],
      removedText: [],
      modifiedSections: [],
      changedParagraphs: 0,
      changedHeadings: 0,
      changedCodeBlocks: 0,
      changeRatio: 0,
      addedCharCount: 0,
      removedCharCount: 0,
      changedCharCount: 0,
      identical: true,
    };
  }

  const origParas = splitParagraphs(orig);
  const nextParas = splitParagraphs(next);
  const paraDiff = setDiff(origParas, nextParas);

  const headingDiff = setDiff(extractHeadings(orig), extractHeadings(next));
  const codeDiff = setDiff(extractCodeBlocks(orig), extractCodeBlocks(next));

  const addedText = paraDiff.added;
  const removedText = paraDiff.removed;

  const modifiedSections: DiffSectionChange[] = [
    ...addedText.map((text) => ({ kind: "added" as const, text })),
    ...removedText.map((text) => ({ kind: "removed" as const, text })),
  ];

  const addedCharCount = addedText.join("").replace(/\s+/g, "").length;
  const removedCharCount = removedText.join("").replace(/\s+/g, "").length;
  const changedCharCount = addedCharCount + removedCharCount;
  const baseLen = Math.max(orig.replace(/\s+/g, "").length, 1);
  const changeRatio = Math.min(1, changedCharCount / baseLen);

  return {
    addedText,
    removedText,
    modifiedSections,
    changedParagraphs: addedText.length + removedText.length,
    changedHeadings: headingDiff.added.length + headingDiff.removed.length,
    changedCodeBlocks: codeDiff.added.length + codeDiff.removed.length,
    changeRatio,
    addedCharCount,
    removedCharCount,
    changedCharCount,
    identical: false,
  };
}

export class DiffService {
  compare(original: string, edited: string): DiffResult {
    return compareDocuments(original, edited);
  }

  isMeaningful(
    diff: DiffResult,
    thresholds: MeaningfulEditThresholds = DEFAULT_MEANINGFUL_THRESHOLDS,
  ): boolean {
    if (diff.identical) return false;
    if (diff.changedCharCount < thresholds.minChangedChars) return false;
    if (diff.changeRatio < thresholds.minChangeRatio) return false;
    if (diff.changedParagraphs < thresholds.minChangedParagraphs) {
      // Allow heading/code-only meaningful changes
      if (diff.changedHeadings === 0 && diff.changedCodeBlocks === 0) {
        return false;
      }
    }
    return true;
  }
}
