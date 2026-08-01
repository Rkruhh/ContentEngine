import { generateText } from "ai";
import { draftModel } from "../ai/client";
import { DRAFT_SYSTEM, REVISE_SYSTEM } from "../ai/prompts";
import type { Brief, EvalResult } from "../ai/schema";
import { runEval } from "../harness/run-eval";
import {
  meetsThreshold,
  overallScore,
  type StopReason,
} from "./quality";

function formatBrief(brief: Brief): string {
  return [
    `Topic: ${brief.topic}`,
    `Audience: ${brief.audience}`,
    `Point of view: ${brief.pov}`,
    `Voice: ${brief.voice}`,
  ].join("\n");
}

function formatList(label: string, items: string[]): string {
  if (items.length === 0) return `${label}\n(none)`;
  return `${label}\n${items.map((item, i) => `${i + 1}. ${item}`).join("\n")}`;
}

/** Build the structured critic brief the Editor consumes. */
export function formatEditorBrief(evaluation: EvalResult): string {
  const improvements =
    evaluation.prioritized_improvements.length > 0
      ? evaluation.prioritized_improvements
      : evaluation.top_fixes;

  const perDimension = Object.entries(evaluation.critique)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n");

  const metricScores = Object.entries(evaluation.scores)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n");

  return [
    `Overall score: ${evaluation.overall_score}`,
    `Confidence: ${evaluation.confidence}`,
    "",
    "Individual metric scores:",
    metricScores,
    "",
    formatList("Strengths (preserve — do not weaken or remove):", evaluation.strengths),
    "",
    formatList("Weaknesses (improve these only):", evaluation.weaknesses),
    "",
    formatList("Prioritized improvements:", improvements),
    "",
    formatList("Do not change:", evaluation.do_not_change),
    "",
    "Per-dimension critique:",
    perDimension,
  ].join("\n");
}

export async function generateDraft(brief: Brief): Promise<string> {
  const { text } = await generateText({
    model: draftModel,
    system: DRAFT_SYSTEM,
    prompt: `Write a short technical piece from this brief:\n\n${formatBrief(brief)}`,
  });
  return text.trim();
}

/**
 * Editor step: incremental revision from structured critic feedback.
 * Rejects are handled by the quality pipeline (overall must improve).
 */
export async function reviseDraft(
  draft: string,
  evalResult: EvalResult,
): Promise<string> {
  const { text } = await generateText({
    model: draftModel,
    system: REVISE_SYSTEM,
    prompt: [
      "Original draft:",
      draft,
      "",
      "Structured critic evaluation:",
      formatEditorBrief(evalResult),
    ].join("\n"),
  });
  return text.trim();
}

/** Legacy one-shot options — unchanged for CLI and existing callers. */
export type PipelineOptions = {
  revise?: boolean;
};

export type PipelineResult = {
  draft: string;
  draftEval: EvalResult;
  revisedDraft?: string;
  revisedEval?: EvalResult;
};

/**
 * Legacy pipeline: draft → evaluate → optional single revise + re-evaluate.
 * Kept for evals CLI and existing tests — no threshold loop.
 */
export async function runPipeline(
  brief: Brief,
  options: PipelineOptions = {},
): Promise<PipelineResult> {
  const draft = await generateDraft(brief);
  const draftEval = await runEval(draft);

  if (!options.revise) {
    return { draft, draftEval };
  }

  const revisedDraft = await reviseDraft(draft, draftEval);
  const revisedEval = await runEval(revisedDraft);

  return { draft, draftEval, revisedDraft, revisedEval };
}

export type QualityPipelineOptions = {
  /** Minimum overall score (mean of rubric dims) to stop. Default 7. */
  threshold?: number;
  /** Max revise attempts after the initial draft. Default 3. */
  maxIterations?: number;
};

/** One step in the revision history (1-based iteration index). */
export type PipelineIteration = {
  iteration: number;
  draft: string;
  evaluation: EvalResult;
  overallScore: number;
  accepted: boolean;
};

export type QualityPipelineResult = {
  /** Complete revision history for UI (Iteration 1…N). */
  iterations: PipelineIteration[];
  /** Alias of iterations for future UI consumers. */
  revisionHistory: PipelineIteration[];
  finalDraft: string;
  finalEvaluation: EvalResult;
  finalOverallScore: number;
  stopReason: StopReason;
  threshold: number;
  maxIterations: number;
};

const DEFAULT_THRESHOLD = 7;
const DEFAULT_MAX_ITERATIONS = 3;

/**
 * Orchestrated quality loop:
 * draft → evaluate → revise while below threshold.
 * Accept a revision only if overall score strictly improves; otherwise keep prior draft.
 */
export async function runQualityPipeline(
  brief: Brief,
  options: QualityPipelineOptions = {},
): Promise<QualityPipelineResult> {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;

  const iterations: PipelineIteration[] = [];

  const initialDraft = await generateDraft(brief);
  const initialEval = await runEval(initialDraft);
  const initialOverall = overallScore(initialEval);

  iterations.push({
    iteration: 1,
    draft: initialDraft,
    evaluation: initialEval,
    overallScore: initialOverall,
    accepted: true,
  });

  let bestDraft = initialDraft;
  let bestEval = initialEval;
  let bestOverall = initialOverall;

  const finish = (
    stopReason: StopReason,
  ): QualityPipelineResult => ({
    iterations,
    revisionHistory: iterations,
    finalDraft: bestDraft,
    finalEvaluation: bestEval,
    finalOverallScore: bestOverall,
    stopReason,
    threshold,
    maxIterations,
  });

  if (meetsThreshold(bestEval, threshold)) {
    return finish("threshold_reached");
  }

  for (let attempt = 1; attempt <= maxIterations; attempt++) {
    const candidateDraft = await reviseDraft(bestDraft, bestEval);
    const candidateEval = await runEval(candidateDraft);
    const candidateOverall = overallScore(candidateEval);
    // Reject ties and regressions — keep previous draft.
    const accepted = candidateOverall > bestOverall;

    iterations.push({
      iteration: attempt + 1,
      draft: candidateDraft,
      evaluation: candidateEval,
      overallScore: candidateOverall,
      accepted,
    });

    if (!accepted) {
      return finish("no_improvement");
    }

    bestDraft = candidateDraft;
    bestEval = candidateEval;
    bestOverall = candidateOverall;

    if (meetsThreshold(bestEval, threshold)) {
      return finish("threshold_reached");
    }
  }

  return finish("max_iterations");
}
