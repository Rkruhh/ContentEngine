/**
 * Public memory API.
 * Consumers must use MemoryManager (via getMemoryManager) — never LocalMemoryStore.
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
