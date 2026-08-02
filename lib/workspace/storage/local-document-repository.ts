import path from "node:path";
import type { DocumentRepository } from "../repositories/document-repository";
import { documentSchema, type Document } from "../types";
import { deleteFile, readJsonFile, writeJsonFile } from "./local-json";

/**
 * Local JSON documents: data/workspace/documents/{projectId}/{documentId}.json
 */
export class LocalDocumentRepository implements DocumentRepository {
  constructor(
    private readonly rootDir = path.join(
      process.cwd(),
      "data",
      "workspace",
      "documents",
    ),
  ) {}

  private docPath(projectId: string, documentId: string) {
    return path.join(this.rootDir, projectId, `${documentId}.json`);
  }

  private projectDir(projectId: string) {
    return path.join(this.rootDir, projectId);
  }

  async listByProject(projectId: string): Promise<Document[]> {
    const { readdir } = await import("node:fs/promises");
    try {
      const files = await readdir(this.projectDir(projectId));
      const docs: Document[] = [];
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const id = file.replace(/\.json$/, "");
        const doc = await this.getById(projectId, id);
        if (doc) docs.push(doc);
      }
      return docs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  async getById(
    projectId: string,
    documentId: string,
  ): Promise<Document | null> {
    const raw = await readJsonFile<unknown>(
      this.docPath(projectId, documentId),
    );
    if (!raw) return null;
    const parsed = documentSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  }

  async create(document: Document): Promise<Document> {
    await writeJsonFile(
      this.docPath(document.projectId, document.id),
      document,
    );
    return document;
  }

  async update(document: Document): Promise<Document> {
    await writeJsonFile(
      this.docPath(document.projectId, document.id),
      document,
    );
    return document;
  }

  async delete(projectId: string, documentId: string): Promise<void> {
    await deleteFile(this.docPath(projectId, documentId));
  }

  async deleteByProject(projectId: string): Promise<void> {
    const docs = await this.listByProject(projectId);
    await Promise.all(docs.map((doc) => this.delete(projectId, doc.id)));
    const { rm } = await import("node:fs/promises");
    try {
      await rm(this.projectDir(projectId), { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}
