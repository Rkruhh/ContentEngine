import type { PipelineIteration } from "../pipeline/run-pipeline";
import type { StopReason } from "../pipeline/quality";

/** Build a short summary from existing evaluation fields — no extra model call. */
export function buildReasoningSummary(
  history: PipelineIteration[],
  stopReason: StopReason,
): string {
  if (history.length === 0) return "No pipeline output yet.";

  const first = history[0]!;
  const lastAccepted =
    [...history].reverse().find((item) => item.accepted) ?? first;
  const delta = lastAccepted.overallScore - first.overallScore;

  if (history.length === 1) {
    const strengths = first.evaluation.strengths.slice(0, 2);
    const strengthText =
      strengths.length > 0
        ? ` Strengths noted: ${strengths.join("; ")}.`
        : "";
    return `The initial draft already met the quality bar (overall ${first.overallScore.toFixed(1)}).${strengthText}`;
  }

  const improvements = (
    first.evaluation.prioritized_improvements.length > 0
      ? first.evaluation.prioritized_improvements
      : first.evaluation.top_fixes
  ).slice(0, 3);

  const preserved = first.evaluation.do_not_change.slice(0, 2);
  const strengths = first.evaluation.strengths.slice(0, 2);

  const parts: string[] = [];
  if (improvements.length > 0) {
    parts.push(
      `The editor focused on ${improvements.map((i) => i.replace(/\.$/, "")).join("; ")}`,
    );
  }
  if (strengths.length > 0) {
    parts.push(`preserved ${strengths.join("; ").toLowerCase()}`);
  } else if (preserved.length > 0) {
    parts.push(`left untouched ${preserved.join("; ").toLowerCase()}`);
  }

  const scoreText = `Overall moved from ${first.overallScore.toFixed(1)} to ${lastAccepted.overallScore.toFixed(1)} (${delta >= 0 ? "+" : ""}${delta.toFixed(1)}).`;

  const stopText =
    stopReason === "threshold_reached"
      ? "Stopped when the quality threshold was reached."
      : stopReason === "max_iterations"
        ? "Stopped after the maximum revision attempts."
        : "Stopped when a revision no longer improved the score.";

  if (parts.length === 0) {
    return `${scoreText} ${stopText}`;
  }

  const lead = parts[0]!;
  const rest = parts.slice(1).join(", ");
  return `${lead}${rest ? `, and ${rest}` : ""}. ${scoreText} ${stopText}`;
}
