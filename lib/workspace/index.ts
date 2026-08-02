/**
 * Client-safe workspace exports (types + document-type registry).
 * Server-only services/factory live in `@/lib/workspace/server`.
 */
export type {
  Document,
  DocumentBrief,
  DocumentType,
  DocumentVersion,
  EvaluationHistoryEntry,
  Project,
  ProjectSummary,
} from "./types";
export {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  createProjectInputSchema,
  updateProjectInputSchema,
  createDocumentInputSchema,
  updateDocumentInputSchema,
  documentTypeSchema,
  documentBriefSchema,
} from "./types";
