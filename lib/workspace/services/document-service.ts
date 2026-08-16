import { randomUUID } from "node:crypto";
import type { EvalResult } from "../../ai/schema";
import type { StopReason } from "../../pipeline/quality";
import type { DocumentRepository } from "../repositories/document-repository";
import type { ProjectRepository } from "../repositories/project-repository";
import type {
  Document,
  DocumentBrief,
  DocumentType,
  DocumentVersion,
} from "../types";

export type CreateDocumentInput = {
  title: string;
  documentType: DocumentType;
  brief: DocumentBrief;
};

export type UpdateDocumentInput = {
  title?: string;
  documentType?: DocumentType;
  brief?: DocumentBrief;
  currentVersion?: number;
};

export type AddVersionInput = {
  content: string;
  evaluation: EvalResult;
  iterationCount: number;
  finalScore: number;
  stopReason?: StopReason;
  source?: "pipeline" | "user_edit";
  baseVersionId?: string;
};

export class DocumentService {
  constructor(
    private readonly documents: DocumentRepository,
    private readonly projects: ProjectRepository,
  ) {}

  async list(projectId: string): Promise<Document[]> {
    return this.documents.listByProject(projectId);
  }

  async get(projectId: string, documentId: string): Promise<Document | null> {
    return this.documents.getById(projectId, documentId);
  }

  async create(
    projectId: string,
    input: CreateDocumentInput,
  ): Promise<Document | null> {
    const project = await this.projects.getById(projectId);
    if (!project) return null;

    const now = new Date().toISOString();
    const document: Document = {
      id: randomUUID(),
      projectId,
      title: input.title.trim(),
      documentType: input.documentType,
      brief: input.brief,
      currentVersion: 0,
      versionHistory: [],
      evaluationHistory: [],
      createdAt: now,
      updatedAt: now,
    };

    await this.documents.create(document);
    await this.projects.update({
      ...project,
      updatedAt: now,
    });
    return document;
  }

  async update(
    projectId: string,
    documentId: string,
    input: UpdateDocumentInput,
  ): Promise<Document | null> {
    const existing = await this.documents.getById(projectId, documentId);
    if (!existing) return null;

    if (
      input.currentVersion !== undefined &&
      !existing.versionHistory.some(
        (v) => v.versionNumber === input.currentVersion,
      )
    ) {
      throw new Error(`Version ${input.currentVersion} does not exist`);
    }

    const next: Document = {
      ...existing,
      title: input.title?.trim() ?? existing.title,
      documentType: input.documentType ?? existing.documentType,
      brief: input.brief ?? existing.brief,
      currentVersion: input.currentVersion ?? existing.currentVersion,
      updatedAt: new Date().toISOString(),
    };

    await this.documents.update(next);
    const project = await this.projects.getById(projectId);
    if (project) {
      await this.projects.update({
        ...project,
        updatedAt: next.updatedAt,
      });
    }
    return next;
  }

  async delete(projectId: string, documentId: string): Promise<boolean> {
    const existing = await this.documents.getById(projectId, documentId);
    if (!existing) return false;
    await this.documents.delete(projectId, documentId);
    return true;
  }

  /** Append an immutable version from a successful pipeline run. */
  async addVersion(
    projectId: string,
    documentId: string,
    input: AddVersionInput,
  ): Promise<Document | null> {
    const existing = await this.documents.getById(projectId, documentId);
    if (!existing) return null;

    const versionNumber = existing.versionHistory.length + 1;
    const now = new Date().toISOString();
    const version: DocumentVersion = {
      id: randomUUID(),
      versionNumber,
      content: input.content,
      evaluation: input.evaluation,
      createdAt: now,
      iterationCount: input.iterationCount,
      finalScore: input.finalScore,
      stopReason: input.stopReason,
      source: input.source ?? "pipeline",
      baseVersionId: input.baseVersionId,
    };

    const next: Document = {
      ...existing,
      currentVersion: versionNumber,
      versionHistory: [...existing.versionHistory, version],
      evaluationHistory: [
        ...existing.evaluationHistory,
        {
          versionId: version.id,
          versionNumber,
          evaluation: input.evaluation,
          finalScore: input.finalScore,
          createdAt: now,
        },
      ],
      updatedAt: now,
    };

    await this.documents.update(next);
    const project = await this.projects.getById(projectId);
    if (project) {
      await this.projects.update({ ...project, updatedAt: now });
    }
    return next;
  }

  getCurrentVersion(document: Document): DocumentVersion | null {
    if (document.currentVersion === 0) return null;
    return (
      document.versionHistory.find(
        (v) => v.versionNumber === document.currentVersion,
      ) ?? null
    );
  }

  /**
   * Append a user-edited version without overwriting the base.
   * Reuses the base evaluation (no critic re-run required to save).
   */
  async addUserEditVersion(
    projectId: string,
    documentId: string,
    input: { content: string; baseVersionId: string },
  ): Promise<Document | null> {
    const existing = await this.documents.getById(projectId, documentId);
    if (!existing) return null;

    const base = existing.versionHistory.find(
      (v) => v.id === input.baseVersionId,
    );
    if (!base) {
      throw new Error("Base version not found");
    }

    return this.addVersion(projectId, documentId, {
      content: input.content,
      evaluation: base.evaluation,
      iterationCount: base.iterationCount,
      finalScore: base.finalScore,
      stopReason: base.stopReason,
      source: "user_edit",
      baseVersionId: base.id,
    });
  }
}
