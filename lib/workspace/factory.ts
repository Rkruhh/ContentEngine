import { DocumentService } from "./services/document-service";
import { ProjectService } from "./services/project-service";
import { LocalDocumentRepository } from "./storage/local-document-repository";
import { LocalProjectRepository } from "./storage/local-project-repository";

/**
 * Composition root for workspace services.
 * Swap Local*Repository → Postgres later without changing routes/UI.
 */
let projectService: ProjectService | null = null;
let documentService: DocumentService | null = null;

export function getProjectService(): ProjectService {
  if (!projectService || !documentService) {
    const projects = new LocalProjectRepository();
    const documents = new LocalDocumentRepository();
    projectService = new ProjectService(projects, documents);
    documentService = new DocumentService(documents, projects);
  }
  return projectService;
}

export function getDocumentService(): DocumentService {
  if (!projectService || !documentService) {
    getProjectService();
  }
  return documentService!;
}

/** Test helper */
export function setWorkspaceServices(
  projects: ProjectService | null,
  documents: DocumentService | null,
): void {
  projectService = projects;
  documentService = documents;
}
