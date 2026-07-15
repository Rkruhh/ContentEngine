import { generateText } from "ai";
import { draftModel } from "../ai/client";
import { DRAFT_SYSTEM, REVISE_SYSTEM } from "../ai/prompts";
import type { Brief, EvalResult } from "../ai/schema";
import { runEval } from "../harness/run-eval";

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

export type PipelineOptions = {
  revise?: boolean;
};

export type PipelineResult = {
  draft: string;
  draftEval: EvalResult;
  revisedDraft?: string;
  revisedEval?: EvalResult;
};

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
