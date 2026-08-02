import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MemoryStore } from "./store";
import { emptyMemory, userMemorySchema, type UserMemory } from "./types";

/**
 * Phase 2 local persistence — JSON files under data/memory/.
 * Not exported from the public memory barrel; only the factory wires this in.
 */
export class LocalMemoryStore implements MemoryStore {
  constructor(
    private readonly rootDir = path.join(process.cwd(), "data", "memory"),
  ) {}

  private filePath(userId: string): string {
    const safe = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
    return path.join(this.rootDir, `${safe}.json`);
  }

  async read(userId: string): Promise<UserMemory | null> {
    try {
      const raw = await readFile(this.filePath(userId), "utf8");
      const parsed = userMemorySchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : emptyMemory(userId);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async write(userId: string, memory: UserMemory): Promise<void> {
    await mkdir(this.rootDir, { recursive: true });
    const target = this.filePath(userId);
    const temp = `${target}.${process.pid}.tmp`;
    await writeFile(temp, `${JSON.stringify(memory, null, 2)}\n`, "utf8");
    await rename(temp, target);
  }

  async delete(userId: string): Promise<void> {
    try {
      await unlink(this.filePath(userId));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
  }
}
