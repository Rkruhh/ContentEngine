/**
 * Server-only knowledge / RAG API.
 */
export type {
  KnowledgeSource,
  KnowledgeChunk,
  RetrievedChunk,
  ChunkMetadata,
} from "./types";
export { KNOWLEDGE_LIMITS, KNOWLEDGE_SOURCE_TYPES } from "./types";
export type { VectorStore } from "./vector-store";
export type { EmbeddingService } from "./embedding-service";
export {
  LocalEmbeddingService,
  DEFAULT_LOCAL_EMBEDDING_MODEL,
  LOCAL_EMBEDDING_DIMENSIONS,
} from "./embedding-service";
export { LocalJsonVectorStore } from "./local-json-vector-store";
export { KnowledgeIngestService } from "./ingest-service";
export { KnowledgeRetriever } from "./retriever";
export {
  buildKnowledgeContext,
  buildRetrievalQuery,
} from "./context-builder";
export { chunkText } from "./chunker";
export {
  getKnowledgeSourceStore,
  getVectorStore,
  getEmbeddingService,
  getKnowledgeIngestService,
  getKnowledgeRetriever,
  setKnowledgeServices,
} from "./factory";
export {
  parseGithubUrl,
  shouldIngestGithubPath,
} from "./parsers/github-fetcher";
export { cosineSimilarity } from "./similarity";
