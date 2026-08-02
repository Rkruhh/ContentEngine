/**
 * Server-only memory API — managers and stores that touch the filesystem.
 * Client components should import types from `@/lib/memory/types` only.
 */
export type { MemoryStore } from "./store";
export type { MemoryManager, UpdateMemoryInput } from "./manager";
export { DefaultMemoryManager } from "./manager";
export {
  createMemoryManager,
  getMemoryManager,
  setMemoryManager,
} from "./factory";
export { formatMemoryForPrompt } from "./format";
export { mergePreferences, mergeUniqueStrings } from "./merge";
export {
  emptyMemory,
  LOCAL_USER_ID,
  userMemorySchema,
  type MemoryPatch,
  type UserMemory,
} from "./types";
