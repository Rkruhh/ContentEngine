import { randomUUID } from "node:crypto";
import {
  confidenceFromOccurrences,
  preferenceObservationKey,
  type LearnedPreference,
  type PreferenceObservation,
} from "./preference-observation";

/**
 * Aggregate repeated edit observations into durable learned preferences.
 * One observation → low confidence; never promotes a one-off to high.
 */
export class PreferenceAggregator {
  aggregate(
    existing: LearnedPreference[],
    incoming: PreferenceObservation[],
  ): LearnedPreference[] {
    const byKey = new Map<string, LearnedPreference>();

    for (const pref of existing) {
      byKey.set(
        preferenceObservationKey(pref.category, pref.preference),
        { ...pref },
      );
    }

    const now = new Date().toISOString();

    for (const obs of incoming) {
      const key = preferenceObservationKey(obs.category, obs.preference);
      const current = byKey.get(key);
      if (!current) {
        const { level, score } = confidenceFromOccurrences(1);
        byKey.set(key, {
          id: randomUUID(),
          category: obs.category,
          preference: obs.preference,
          evidence: obs.evidence,
          source: "user_edit",
          confidence: level,
          confidenceScore: score,
          occurrences: 1,
          scope: obs.scope,
          projectId: obs.projectId ?? null,
          createdAt: now,
          updatedAt: now,
        });
        continue;
      }

      const occurrences = current.occurrences + 1;
      const { level, score } = confidenceFromOccurrences(occurrences);
      byKey.set(key, {
        ...current,
        occurrences,
        confidence: level,
        confidenceScore: score,
        evidence: obs.evidence,
        updatedAt: now,
        // Keep original scope; do not silently promote project → user
        scope: current.scope,
        projectId: current.projectId ?? obs.projectId ?? null,
      });
    }

    return [...byKey.values()].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  removePreference(
    existing: LearnedPreference[],
    preferenceId: string,
  ): LearnedPreference[] {
    return existing.filter((p) => p.id !== preferenceId);
  }
}
