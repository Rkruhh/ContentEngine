/**
 * Server-only workspace API — services, storage factory, brief resolution.
 * Do not import this from `"use client"` modules.
 */
export type {
  Document,
  DocumentBrief,
  DocumentType,
  DocumentVersion,
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
export { resolveDocumentBrief } from "./brief";
export { ProjectService } from "./services/project-service";
export { DocumentService } from "./services/document-service";
export {
  getProjectService,
  getDocumentService,
  setWorkspaceServices,
} from "./factory";
