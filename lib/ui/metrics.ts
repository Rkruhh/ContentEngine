import type { EvalResult } from "../ai/schema";
import type { RubricKey } from "../harness/rubric";

/** Display labels for the quality dashboard (maps to existing rubric keys). */
export const DASHBOARD_METRICS: {
  key: RubricKey;
  label: string;
}[] = [
  { key: "tone", label: "Clarity" },
  { key: "structure", label: "Structure" },
  { key: "technical_precision", label: "Technical Accuracy" },
  { key: "geo_readability", label: "Readability" },
  { key: "point_of_view", label: "Point of View" },
];

export function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
