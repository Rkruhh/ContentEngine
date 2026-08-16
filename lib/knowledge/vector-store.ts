import type { KnowledgeChunk, RetrievedChunk } from "./types";

/**
 * Persistence + similarity search for knowledge chunks.
 * Phase 2: LocalJsonVectorStore. Later: Postgres/pgvector, etc.
 */
export interface VectorStore {
  addChunks(chunks: KnowledgeChunk[]): Promise<void>;
  search(input: {
    projectId: string;
    embedding: number[];
    topK: number;
  }): Promise<RetrievedChunk[]>;
  deleteBySource(projectId: string, sourceId: string): Promise<void>;
  deleteByProject(projectId: string): Promise<void>;
  countBySource(projectId: string, sourceId: string): Promise<number>;
}
