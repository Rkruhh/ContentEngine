/**
 * Client-safe memory exports (types + pure helpers only).
 * Server code that needs persistence should import `@/lib/memory/server`.
 */
export { formatMemoryForPrompt } from "./format";
export { mergePreferences, mergeUniqueStrings } from "./merge";
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
  PREFERENCE_CATEGORIES,
} from "./preference-observation";
