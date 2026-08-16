import path from "node:path";
import {
  deleteFile,
  readJsonFile,
  writeJsonFile,
} from "../workspace/storage/local-json";
import { cosineSimilarity } from "./similarity";
import type { VectorStore } from "./vector-store";
import type { KnowledgeChunk, RetrievedChunk } from "./types";

type ProjectChunkFile = {
  projectId: string;
  chunks: KnowledgeChunk[];
};

/**
 * Persistent JSON vector store under data/knowledge/vectors/{projectId}.json
 */
export class LocalJsonVectorStore implements VectorStore {
  constructor(
    private readonly rootDir = path.join(
      process.cwd(),
      "data",
      "knowledge",
      "vectors",
    ),
  ) {}

  private filePath(projectId: string) {
    const safe = projectId.replace(/[^a-zA-Z0-9_-]/g, "_");
    return path.join(this.rootDir, `${safe}.json`);
  }

  private async load(projectId: string): Promise<ProjectChunkFile> {
    const raw = await readJsonFile<ProjectChunkFile>(this.filePath(projectId));
    return raw ?? { projectId, chunks: [] };
  }

  private async save(file: ProjectChunkFile): Promise<void> {
    await writeJsonFile(this.filePath(file.projectId), file);
  }

  async addChunks(chunks: KnowledgeChunk[]): Promise<void> {
    if (chunks.length === 0) return;
    const byProject = new Map<string, KnowledgeChunk[]>();
    for (const chunk of chunks) {
      const list = byProject.get(chunk.projectId) ?? [];
      list.push(chunk);
      byProject.set(chunk.projectId, list);
    }
    for (const [projectId, incoming] of byProject) {
      const file = await this.load(projectId);
      const sourceIds = new Set(incoming.map((c) => c.sourceId));
      file.chunks = [
        ...file.chunks.filter((c) => !sourceIds.has(c.sourceId)),
        ...incoming,
      ];
      await this.save(file);
    }
  }

  async search(input: {
    projectId: string;
    embedding: number[];
    topK: number;
  }): Promise<RetrievedChunk[]> {
    const file = await this.load(input.projectId);
    const scored = file.chunks
      .filter((c) => c.projectId === input.projectId)
      .map((chunk) => ({
        chunk,
        score: cosineSimilarity(input.embedding, chunk.embedding),
      }))
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, Math.max(1, input.topK));
  }

  async deleteBySource(projectId: string, sourceId: string): Promise<void> {
    const file = await this.load(projectId);
    file.chunks = file.chunks.filter((c) => c.sourceId !== sourceId);
    await this.save(file);
  }

  async deleteByProject(projectId: string): Promise<void> {
    await deleteFile(this.filePath(projectId));
  }

  async countBySource(projectId: string, sourceId: string): Promise<number> {
    const file = await this.load(projectId);
    return file.chunks.filter((c) => c.sourceId === sourceId).length;
  }
}
