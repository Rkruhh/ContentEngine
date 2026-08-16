import type { UserMemory } from "./types";
import type { LearnedPreference } from "./preference-observation";

/** Serialize memory into a writer-facing prompt block. */
export function formatMemoryForPrompt(
  memory: UserMemory | null | undefined,
  options?: { projectLearnedPreferences?: LearnedPreference[] },
): string {
  if (!memory) return "";

  const learnedForPrompt = (memory.learnedPreferences ?? []).filter(
    (p) => p.confidence === "medium" || p.confidence === "high",
  );
  const projectLearned = (options?.projectLearnedPreferences ?? []).filter(
    (p) => p.confidence === "medium" || p.confidence === "high",
  );

  const hasSignal =
    memory.preferredTone ||
    memory.preferredWritingStyle ||
    memory.audience ||
    memory.preferredParagraphLength ||
    memory.preferredDocumentStructure ||
    memory.frequentlyUsedTerminology.length > 0 ||
    memory.writingGoals.length > 0 ||
    memory.knownPreferences.length > 0 ||
    learnedForPrompt.length > 0 ||
    projectLearned.length > 0;

  if (!hasSignal) return "";

  const lines: string[] = [
    "Stored writing memory for this user (honor unless the current brief explicitly overrides):",
  ];

  if (memory.preferredTone) {
    lines.push(`- Preferred tone: ${memory.preferredTone}`);
  }
  if (memory.preferredWritingStyle) {
    lines.push(`- Preferred writing style: ${memory.preferredWritingStyle}`);
  }
  if (memory.audience) {
    lines.push(`- Usual audience: ${memory.audience}`);
  }
  if (memory.preferredParagraphLength) {
    lines.push(
      `- Preferred paragraph length: ${memory.preferredParagraphLength}`,
    );
  }
  if (memory.preferredDocumentStructure) {
    lines.push(
      `- Preferred document structure: ${memory.preferredDocumentStructure}`,
    );
  }
  if (memory.writingGoals.length > 0) {
    lines.push(`- Writing goals: ${memory.writingGoals.slice(0, 8).join("; ")}`);
  }
  if (memory.frequentlyUsedTerminology.length > 0) {
    lines.push(
      `- Preferred terminology: ${memory.frequentlyUsedTerminology.slice(0, 12).join(", ")}`,
    );
  }
  if (memory.knownPreferences.length > 0) {
    lines.push(
      `- Other preferences: ${memory.knownPreferences.slice(0, 8).join("; ")}`,
    );
  }
  if (learnedForPrompt.length > 0) {
    lines.push("- Learned from edits (medium/high confidence only):");
    for (const pref of learnedForPrompt.slice(0, 8)) {
      lines.push(
        `  - [${pref.category}] ${pref.preference} (${pref.confidence}, ${pref.occurrences}x)`,
      );
    }
  }
  if (projectLearned.length > 0) {
    lines.push("- Project-specific learned preferences:");
    for (const pref of projectLearned.slice(0, 6)) {
      lines.push(
        `  - [${pref.category}] ${pref.preference} (${pref.confidence}, ${pref.occurrences}x)`,
      );
    }
  }

  return lines.join("\n");
}
