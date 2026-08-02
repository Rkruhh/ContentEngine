import path from "node:path";
import type { ProjectRepository } from "../repositories/project-repository";
import { projectSchema, type Project } from "../types";
import { deleteFile, readJsonFile, writeJsonFile } from "./local-json";

type ProjectIndex = { ids: string[] };

/**
 * Local JSON project store under data/workspace/projects/.
 * Not exported from the public workspace barrel — factory-only.
 */
export class LocalProjectRepository implements ProjectRepository {
  constructor(
    private readonly rootDir = path.join(
      process.cwd(),
      "data",
      "workspace",
      "projects",
    ),
  ) {}

  private indexPath() {
    return path.join(this.rootDir, "index.json");
  }

  private projectPath(id: string) {
    return path.join(this.rootDir, `${id}.json`);
  }

  private async readIndex(): Promise<ProjectIndex> {
    return (await readJsonFile<ProjectIndex>(this.indexPath())) ?? { ids: [] };
  }

  private async writeIndex(index: ProjectIndex): Promise<void> {
    await writeJsonFile(this.indexPath(), index);
  }

  async list(): Promise<Project[]> {
    const index = await this.readIndex();
    const projects: Project[] = [];
    for (const id of index.ids) {
      const project = await this.getById(id);
      if (project) projects.push(project);
    }
    return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getById(id: string): Promise<Project | null> {
    const raw = await readJsonFile<unknown>(this.projectPath(id));
    if (!raw) return null;
    const parsed = projectSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  }

  async create(project: Project): Promise<Project> {
    await writeJsonFile(this.projectPath(project.id), project);
    const index = await this.readIndex();
    if (!index.ids.includes(project.id)) {
      index.ids.unshift(project.id);
      await this.writeIndex(index);
    }
    return project;
  }

  async update(project: Project): Promise<Project> {
    await writeJsonFile(this.projectPath(project.id), project);
    return project;
  }

  async delete(id: string): Promise<void> {
    await deleteFile(this.projectPath(id));
    const index = await this.readIndex();
    index.ids = index.ids.filter((item) => item !== id);
    await this.writeIndex(index);
  }
}
