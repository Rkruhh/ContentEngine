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

export async function generateDraft(brief: Brief): Promise<string> {
  const { text } = await generateText({
    model: draftModel,
    system: DRAFT_SYSTEM,
    prompt: `Write a short technical piece from this brief:\n\n${formatBrief(brief)}`,
  });
  return text.trim();
}

export async function reviseDraft(
  draft: string,
  evalResult: EvalResult,
): Promise<string> {
  const fixes = evalResult.top_fixes.map((f, i) => `${i + 1}. ${f}`).join("\n");
  const critiques = Object.entries(evalResult.critique)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const { text } = await generateText({
    model: draftModel,
    system: REVISE_SYSTEM,
    prompt: [
      "Original draft:",
      draft,
      "",
      "Editor critique:",
      critiques,
      "",
      "Top fixes to apply:",
      fixes,
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

export type PipelineIteration = {
  iteration: number;
  draft: string;
  evaluation: EvalResult;
  overallScore: number;
  accepted: boolean;
};

export type QualityPipelineResult = {
  iterations: PipelineIteration[];
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
 * draft → evaluate → revise while below threshold (accept only if overall improves).
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
    iteration: 0,
    draft: initialDraft,
    evaluation: initialEval,
    overallScore: initialOverall,
    accepted: true,
  });

  let bestDraft = initialDraft;
  let bestEval = initialEval;
  let bestOverall = initialOverall;

  if (meetsThreshold(bestEval, threshold)) {
    return {
      iterations,
      finalDraft: bestDraft,
      finalEvaluation: bestEval,
      finalOverallScore: bestOverall,
      stopReason: "threshold_reached",
      threshold,
      maxIterations,
    };
  }

  for (let attempt = 1; attempt <= maxIterations; attempt++) {
    const candidateDraft = await reviseDraft(bestDraft, bestEval);
    const candidateEval = await runEval(candidateDraft);
    const candidateOverall = overallScore(candidateEval);
    const accepted = candidateOverall > bestOverall;

    iterations.push({
      iteration: attempt,
      draft: candidateDraft,
      evaluation: candidateEval,
      overallScore: candidateOverall,
      accepted,
    });

    if (!accepted) {
      return {
        iterations,
        finalDraft: bestDraft,
        finalEvaluation: bestEval,
        finalOverallScore: bestOverall,
        stopReason: "no_improvement",
        threshold,
        maxIterations,
      };
    }

    bestDraft = candidateDraft;
    bestEval = candidateEval;
    bestOverall = candidateOverall;

    if (meetsThreshold(bestEval, threshold)) {
      return {
        iterations,
        finalDraft: bestDraft,
        finalEvaluation: bestEval,
        finalOverallScore: bestOverall,
        stopReason: "threshold_reached",
        threshold,
        maxIterations,
      };
    }
  }

  return {
    iterations,
    finalDraft: bestDraft,
    finalEvaluation: bestEval,
    finalOverallScore: bestOverall,
    stopReason: "max_iterations",
    threshold,
    maxIterations,
  };
}
