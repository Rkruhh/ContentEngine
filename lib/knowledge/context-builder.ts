import type { RetrievedChunk } from "./types";

export type BuiltKnowledgeContext = {
  /** Prompt block for Writer / Critic */
  promptBlock: string;
  /** Structured citation metadata for future UI */
  citations: {
    label: string;
    sourceName: string;
    sourceType: string;
    filePath?: string;
    pageNumber?: number;
    githubPath?: string;
    score: number;
  }[];
};

/**
 * Convert retrieved chunks into structured LLM context (not the full KB).
 */
export function buildKnowledgeContext(
  retrieved: RetrievedChunk[],
): BuiltKnowledgeContext {
  if (retrieved.length === 0) {
    return { promptBlock: "", citations: [] };
  }

  const citations = retrieved.map((item, index) => {
    const meta = item.chunk.metadata;
    let label = `[Source: ${meta.sourceName}]`;
    if (meta.pageNumber) {
      label = `[Source: ${meta.sourceName}, page ${meta.pageNumber}]`;
    } else if (meta.githubPath) {
      label = `[Source: ${meta.githubPath}]`;
    } else if (meta.filePath) {
      label = `[Source: ${meta.filePath}]`;
    }
    return {
      label,
      sourceName: meta.sourceName,
      sourceType: meta.sourceType,
      filePath: meta.filePath,
      pageNumber: meta.pageNumber,
      githubPath: meta.githubPath,
      score: item.score,
      index: index + 1,
    };
  });

  const sections = retrieved.map((item, index) => {
    const cite = citations[index]!;
    return [
      `### Excerpt ${index + 1} ${cite.label}`,
      item.chunk.text,
    ].join("\n");
  });

  const promptBlock = [
    "Retrieved project knowledge (trusted sources — prefer these facts; cite with the Source labels when making technical claims):",
    "",
    ...sections,
  ].join("\n");

  return {
    promptBlock,
    citations: citations.map(({ index: _i, ...rest }) => rest),
  };
}

/** Build a retrieval query from document brief fields. */
export function buildRetrievalQuery(input: {
  title?: string;
  topic: string;
  documentType?: string;
  pov?: string;
}): string {
  return [
    input.title,
    input.topic,
    input.documentType,
    input.pov,
  ]
    .filter(Boolean)
    .join(" — ");
}
