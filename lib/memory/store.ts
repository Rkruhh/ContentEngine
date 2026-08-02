import type { UserMemory } from "./types";

/**
 * Persistence-only adapter.
 * Future swaps (no pipeline changes):
 * - LocalMemoryStore (Phase 2)
 * - VectorMemoryStore
 * - PostgreSQLMemoryStore
 * - RedisMemoryStore
 */
export interface MemoryStore {
  read(userId: string): Promise<UserMemory | null>;
  write(userId: string, memory: UserMemory): Promise<void>;
  delete(userId: string): Promise<void>;
}
