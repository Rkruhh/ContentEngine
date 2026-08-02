import { describe, expect, it } from "vitest";
import { resolveDocumentBrief } from "../lib/workspace/brief";
import { DocumentService } from "../lib/workspace/services/document-service";
import { ProjectService } from "../lib/workspace/services/project-service";
import type { DocumentRepository } from "../lib/workspace/repositories/document-repository";
import type { ProjectRepository } from "../lib/workspace/repositories/project-repository";
import { evalResultSchema } from "../lib/ai/schema";
import type { Document, Project } from "../lib/workspace/types";

class MemoryProjectRepo implements ProjectRepository {
  private items = new Map<string, Project>();
  async list() {
    return [...this.items.values()];
  }
  async getById(id: string) {
    return this.items.get(id) ?? null;
  }
  async create(project: Project) {
    this.items.set(project.id, project);
    return project;
  }
  async update(project: Project) {
    this.items.set(project.id, project);
    return project;
  }
  async delete(id: string) {
    this.items.delete(id);
  }
}

class MemoryDocumentRepo implements DocumentRepository {
  private items = new Map<string, Document>();
  private key(projectId: string, documentId: string) {
    return `${projectId}:${documentId}`;
  }
  async listByProject(projectId: string) {
    return [...this.items.values()].filter((d) => d.projectId === projectId);
  }
  async getById(projectId: string, documentId: string) {
    return this.items.get(this.key(projectId, documentId)) ?? null;
  }
  async create(document: Document) {
    this.items.set(this.key(document.projectId, document.id), document);
    return document;
  }
  async update(document: Document) {
    this.items.set(this.key(document.projectId, document.id), document);
    return document;
  }
  async delete(projectId: string, documentId: string) {
    this.items.delete(this.key(projectId, documentId));
  }
  async deleteByProject(projectId: string) {
    for (const [key, doc] of this.items) {
      if (doc.projectId === projectId) this.items.delete(key);
    }
  }
}

const sampleEval = evalResultSchema.parse({
  scores: {
    point_of_view: 8,
    structure: 8,
    tone: 8,
    technical_precision: 8,
    geo_readability: 8,
  },
  critique: {
    point_of_view: "Clear",
    structure: "Clear",
    tone: "Clear",
    technical_precision: "Clear",
    geo_readability: "Clear",
  },
  top_fixes: ["a", "b", "c"],
});

describe("workspace services", () => {
  it("creates projects and documents, appends immutable versions", async () => {
    const projects = new MemoryProjectRepo();
    const documents = new MemoryDocumentRepo();
    const projectService = new ProjectService(projects, documents);
    const documentService = new DocumentService(documents, projects);

    const project = await projectService.create({
      name: "React Docs",
      description: "Learning path",
      preferredAudience: "React developers",
      preferredWritingStyle: "Practical",
    });

    const doc = await documentService.create(project.id, {
      title: "Hooks overview",
      documentType: "tutorial",
      brief: {
        topic: "React hooks",
        audience: "Beginners",
        pov: "Hooks simplify state",
        voice: "Friendly",
      },
    });
    expect(doc).not.toBeNull();

    const brief = resolveDocumentBrief(project, doc!);
    expect(brief.audience).toBe("React developers");
    expect(brief.voice).toBe("Practical");

    const v1 = await documentService.addVersion(project.id, doc!.id, {
      content: "# Hooks\n\nFirst version",
      evaluation: sampleEval,
      iterationCount: 1,
      finalScore: 8,
      stopReason: "threshold_reached",
    });
    expect(v1?.currentVersion).toBe(1);
    expect(v1?.versionHistory).toHaveLength(1);
    expect(v1?.evaluationHistory).toHaveLength(1);

    const v2 = await documentService.addVersion(project.id, doc!.id, {
      content: "# Hooks\n\nSecond version",
      evaluation: sampleEval,
      iterationCount: 2,
      finalScore: 8.5,
      stopReason: "max_iterations",
    });
    expect(v2?.versionHistory).toHaveLength(2);
    expect(v2?.currentVersion).toBe(2);

    const switched = await documentService.update(project.id, doc!.id, {
      currentVersion: 1,
    });
    expect(switched?.currentVersion).toBe(1);
    expect(switched?.versionHistory).toHaveLength(2);

    const summary = await projectService.getSummary(project.id);
    expect(summary?.documentCount).toBe(1);
    expect(summary?.averageQuality).toBe(8);
  });
});
