import { generateText } from "ai";
import { evalModel } from "../ai/client";
import { EVAL_SYSTEM } from "../ai/prompts";
import { evalResultSchema, type EvalResult } from "../ai/schema";
import { overallScore } from "../pipeline/quality";

/** Strip optional markdown fences and isolate the JSON object. */
export function parseEvalJson(raw: string): unknown {
  let text = raw.trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Eval response did not contain a JSON object.");
  }
  return JSON.parse(text.slice(start, end + 1));
}

export type RunEvalOptions = {
  /** Retrieved knowledge block for grounding (from ContextBuilder). */
  knowledgeContext?: string | null;
};

/**
 * Critic step: evaluate a draft into structured feedback.
 * overall_score is always recomputed from metric scores so the pipeline
 * accept/reject gate stays consistent.
 */
export async function runEval(
  draft: string,
  options: RunEvalOptions = {},
): Promise<EvalResult> {
  const knowledge = options.knowledgeContext?.trim();
  const prompt = [
    knowledge
      ? `${knowledge}\n\nUse the sources above when judging technical claims.`
      : "",
    `Evaluate this draft:\n\n${draft}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const { text } = await generateText({
    model: evalModel,
    system: EVAL_SYSTEM,
    prompt,
  });

  let parsed: unknown;
  try {
    parsed = parseEvalJson(text);
  } catch (err) {
    throw new Error(
      `Failed to parse eval JSON: ${err instanceof Error ? err.message : String(err)}\nRaw: ${text.slice(0, 400)}`,
    );
  }

  const result = evalResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Eval response failed schema validation: ${result.error.message}`,
    );
  }

  return {
    ...result.data,
    overall_score: overallScore(result.data),
  };
}
