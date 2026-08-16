import type { KnowledgeSource } from "./types";

export interface KnowledgeSourceStore {
  listByProject(projectId: string): Promise<KnowledgeSource[]>;
  getById(projectId: string, sourceId: string): Promise<KnowledgeSource | null>;
  create(source: KnowledgeSource): Promise<KnowledgeSource>;
  update(source: KnowledgeSource): Promise<KnowledgeSource>;
  delete(projectId: string, sourceId: string): Promise<void>;
}
