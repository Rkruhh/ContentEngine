import type { Document } from "../types";

/**
 * Persistence-only document repository.
 * Swap Local → Postgres later without changing DocumentService.
 */
export interface DocumentRepository {
  listByProject(projectId: string): Promise<Document[]>;
  getById(projectId: string, documentId: string): Promise<Document | null>;
  create(document: Document): Promise<Document>;
  update(document: Document): Promise<Document>;
  delete(projectId: string, documentId: string): Promise<void>;
  deleteByProject(projectId: string): Promise<void>;
}
