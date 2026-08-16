import { randomUUID } from "node:crypto";
import type { DocumentRepository } from "../repositories/document-repository";
import type { ProjectRepository } from "../repositories/project-repository";
import type {
  Project,
  ProjectSummary,
} from "../types";
import { LOCAL_USER_ID } from "../../memory/types";

export type CreateProjectInput = {
  name: string;
  description?: string;
  preferredWritingStyle?: string | null;
  preferredAudience?: string | null;
};

export type UpdateProjectInput = Partial<CreateProjectInput>;

export class ProjectService {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly documents: DocumentRepository,
  ) {}

  async list(): Promise<ProjectSummary[]> {
    const all = await this.projects.list();
    return Promise.all(all.map((project) => this.toSummary(project)));
  }

  async get(id: string): Promise<Project | null> {
    return this.projects.getById(id);
  }

  async getSummary(id: string): Promise<ProjectSummary | null> {
    const project = await this.projects.getById(id);
    if (!project) return null;
    return this.toSummary(project);
  }

  async create(input: CreateProjectInput): Promise<Project> {
    const now = new Date().toISOString();
    const project: Project = {
      id: randomUUID(),
      name: input.name.trim(),
      description: (input.description ?? "").trim(),
      createdAt: now,
      updatedAt: now,
      preferredWritingStyle: input.preferredWritingStyle?.trim() || null,
      preferredAudience: input.preferredAudience?.trim() || null,
      memoryRef: LOCAL_USER_ID,
      knowledgeSourceIds: [],
    };
    return this.projects.create(project);
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project | null> {
    const existing = await this.projects.getById(id);
    if (!existing) return null;
    const next: Project = {
      ...existing,
      name: input.name?.trim() ?? existing.name,
      description:
        input.description !== undefined
          ? input.description.trim()
          : existing.description,
      preferredWritingStyle:
        input.preferredWritingStyle !== undefined
          ? input.preferredWritingStyle?.trim() || null
          : existing.preferredWritingStyle,
      preferredAudience:
        input.preferredAudience !== undefined
          ? input.preferredAudience?.trim() || null
          : existing.preferredAudience,
      updatedAt: new Date().toISOString(),
    };
    return this.projects.update(next);
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.projects.getById(id);
    if (!existing) return false;
    await this.documents.deleteByProject(id);
    await this.projects.delete(id);
    return true;
  }

  async touch(id: string): Promise<void> {
    const existing = await this.projects.getById(id);
    if (!existing) return;
    await this.projects.update({
      ...existing,
      updatedAt: new Date().toISOString(),
    });
  }

  /** Keep denormalized IDs in sync; source of truth remains KnowledgeSourceStore. */
  async setKnowledgeSourceIds(
    id: string,
    knowledgeSourceIds: string[],
  ): Promise<Project | null> {
    const existing = await this.projects.getById(id);
    if (!existing) return null;
    return this.projects.update({
      ...existing,
      knowledgeSourceIds: [...knowledgeSourceIds],
      updatedAt: new Date().toISOString(),
    });
  }

  private async toSummary(project: Project): Promise<ProjectSummary> {
    const docs = await this.documents.listByProject(project.id);
    const scores = docs
      .map((doc) => {
        const version = doc.versionHistory.find(
          (v) => v.versionNumber === doc.currentVersion,
        );
        return version?.finalScore;
      })
      .filter((score): score is number => typeof score === "number");

    const averageQuality =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : null;

    const docUpdated = docs.reduce(
      (latest, doc) =>
        doc.updatedAt > latest ? doc.updatedAt : latest,
      project.updatedAt,
    );

    return {
      ...project,
      documentCount: docs.length,
      lastUpdated: docUpdated,
      averageQuality,
    };
  }
}
