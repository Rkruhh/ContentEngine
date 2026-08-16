import type { EmbeddingService } from "./embedding-service";
import type { VectorStore } from "./vector-store";
import { KNOWLEDGE_LIMITS, type RetrievedChunk } from "./types";

export class KnowledgeRetriever {
  constructor(
    private readonly vectors: VectorStore,
    private readonly embeddings: EmbeddingService,
  ) {}

  /**
   * Project-scoped retrieval — never crosses project boundaries.
   */
  async retrieve(input: {
    projectId: string;
    query: string;
    topK?: number;
  }): Promise<RetrievedChunk[]> {
    const query = input.query.trim();
    if (!query) return [];
    const embedding = await this.embeddings.embed(query);
    return this.vectors.search({
      projectId: input.projectId,
      embedding,
      topK: input.topK ?? KNOWLEDGE_LIMITS.defaultTopK,
    });
  }
}
