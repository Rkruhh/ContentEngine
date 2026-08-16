import path from "node:path";
import {
  deleteFile,
  readJsonFile,
  writeJsonFile,
} from "../workspace/storage/local-json";
import type { KnowledgeSourceStore } from "./source-store";
import { knowledgeSourceSchema, type KnowledgeSource } from "./types";

/**
 * Source metadata: data/knowledge/sources/{projectId}/{sourceId}.json
 */
export class LocalKnowledgeSourceStore implements KnowledgeSourceStore {
  constructor(
    private readonly rootDir = path.join(
      process.cwd(),
      "data",
      "knowledge",
      "sources",
    ),
  ) {}

  private dir(projectId: string) {
    return path.join(this.rootDir, projectId);
  }

  private filePath(projectId: string, sourceId: string) {
    return path.join(this.dir(projectId), `${sourceId}.json`);
  }

  async listByProject(projectId: string): Promise<KnowledgeSource[]> {
    const { readdir } = await import("node:fs/promises");
    try {
      const files = await readdir(this.dir(projectId));
      const sources: KnowledgeSource[] = [];
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const id = file.replace(/\.json$/, "");
        const source = await this.getById(projectId, id);
        if (source) sources.push(source);
      }
      return sources.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  async getById(
    projectId: string,
    sourceId: string,
  ): Promise<KnowledgeSource | null> {
    const raw = await readJsonFile<unknown>(this.filePath(projectId, sourceId));
    if (!raw) return null;
    const parsed = knowledgeSourceSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  }

  async create(source: KnowledgeSource): Promise<KnowledgeSource> {
    await writeJsonFile(this.filePath(source.projectId, source.id), source);
    return source;
  }

  async update(source: KnowledgeSource): Promise<KnowledgeSource> {
    await writeJsonFile(this.filePath(source.projectId, source.id), source);
    return source;
  }

  async delete(projectId: string, sourceId: string): Promise<void> {
    await deleteFile(this.filePath(projectId, sourceId));
  }
}
