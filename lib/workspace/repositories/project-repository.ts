import type { Project } from "../types";

/**
 * Persistence-only project repository.
 * Swap Local → Postgres later without changing ProjectService.
 */
export interface ProjectRepository {
  list(): Promise<Project[]>;
  getById(id: string): Promise<Project | null>;
  create(project: Project): Promise<Project>;
  update(project: Project): Promise<Project>;
  delete(id: string): Promise<void>;
}
