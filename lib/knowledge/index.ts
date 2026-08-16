/**
 * Client-safe knowledge exports.
 * Server code must import `@/lib/knowledge/server`.
 */
export type {
  KnowledgeSource,
  KnowledgeSourceType,
  KnowledgeSourceStatus,
  ChunkMetadata,
  RetrievedChunk,
} from "./types";
export { KNOWLEDGE_SOURCE_TYPES, KNOWLEDGE_SOURCE_STATUSES } from "./types";
