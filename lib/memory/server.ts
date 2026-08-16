/**
 * Server-only memory API — managers and stores that touch the filesystem.
 * Client components should import types from `@/lib/memory` only.
 */
export type { MemoryStore } from "./store";
export type {
  MemoryManager,
  UpdateMemoryInput,
  ApplyEditLearningInput,
  ApplyEditLearningResult,
} from "./manager";
export { DefaultMemoryManager } from "./manager";
export {
  createMemoryManager,
  getMemoryManager,
  setMemoryManager,
} from "./factory";
export { formatMemoryForPrompt } from "./format";
export { mergePreferences, mergeUniqueStrings } from "./merge";
export { DiffService, compareDocuments } from "./diff-service";
export { EditTracker } from "./edit-tracker";
export { PreferenceAggregator } from "./preference-aggregator";
export { extractObservationsFromDiff } from "./preference-extractor";
export {
  emptyMemory,
  LOCAL_USER_ID,
  userMemorySchema,
  type MemoryPatch,
  type UserMemory,
} from "./types";
export type {
  LearnedPreference,
  PreferenceObservation,
  PreferenceCategory,
  ConfidenceLevel,
} from "./preference-observation";
export {
  CONFIDENCE_THRESHOLDS,
  confidenceFromOccurrences,
} from "./preference-observation";
