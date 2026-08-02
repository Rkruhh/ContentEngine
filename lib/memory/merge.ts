import type { MemoryPatch, UserMemory } from "./types";

const LIMITS = {
  terminology: 40,
  writingGoals: 20,
  knownPreferences: 30,
  recentLearnings: 15,
} as const;

export function normalizePreference(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function preferenceKey(value: string): string {
  return normalizePreference(value).toLowerCase();
}

/** Merge string lists without case-insensitive duplicates; newest first. */
export function mergeUniqueStrings(
  existing: string[],
  incoming: string[],
  limit: number,
): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const item of [...incoming, ...existing]) {
    const cleaned = normalizePreference(item);
    if (!cleaned) continue;
    const key = preferenceKey(cleaned);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(cleaned);
    if (merged.length >= limit) break;
  }

  return merged;
}

function preferIncoming(
  current: string | null,
  incoming: string | undefined,
): string | null {
  if (!incoming) return current;
  const cleaned = normalizePreference(incoming);
  return cleaned || current;
}

/** Pure merge of a preference patch onto stored memory. */
export function mergePreferences(
  current: UserMemory,
  patch: MemoryPatch,
): UserMemory {
  return {
    ...current,
    preferredTone: preferIncoming(current.preferredTone, patch.preferredTone),
    preferredWritingStyle: preferIncoming(
      current.preferredWritingStyle,
      patch.preferredWritingStyle,
    ),
    audience: preferIncoming(current.audience, patch.audience),
    preferredParagraphLength:
      patch.preferredParagraphLength ?? current.preferredParagraphLength,
    preferredDocumentStructure: preferIncoming(
      current.preferredDocumentStructure,
      patch.preferredDocumentStructure,
    ),
    frequentlyUsedTerminology: mergeUniqueStrings(
      current.frequentlyUsedTerminology,
      patch.frequentlyUsedTerminology ?? [],
      LIMITS.terminology,
    ),
    writingGoals: mergeUniqueStrings(
      current.writingGoals,
      patch.writingGoals ?? [],
      LIMITS.writingGoals,
    ),
    knownPreferences: mergeUniqueStrings(
      current.knownPreferences,
      patch.knownPreferences ?? [],
      LIMITS.knownPreferences,
    ),
    recentLearnings: patch.learningSummary
      ? [
          {
            at: new Date().toISOString(),
            summary: normalizePreference(patch.learningSummary),
          },
          ...current.recentLearnings,
        ].slice(0, LIMITS.recentLearnings)
      : current.recentLearnings,
    updatedAt: new Date().toISOString(),
  };
}

/** @deprecated Use mergePreferences — kept as alias for older imports. */
export const mergeMemoryPatch = mergePreferences;
