import type { EvalResult } from "../ai/schema";
import { RUBRIC_KEYS } from "../harness/rubric";

/** Mean of all rubric dimension scores (0–10). */
export function overallScore(evaluation: EvalResult): number {
  const total = RUBRIC_KEYS.reduce(
    (sum, key) => sum + evaluation.scores[key],
    0,
  );
  return total / RUBRIC_KEYS.length;
}

export function meetsThreshold(
  evaluation: EvalResult,
  threshold: number,
): boolean {
  return overallScore(evaluation) >= threshold;
}

export type StopReason =
  | "threshold_reached"
  | "max_iterations"
  | "no_improvement";
