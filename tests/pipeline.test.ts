import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

vi.mock("../lib/ai/client", () => ({
  draftModel: "draft-model",
  evalModel: "eval-model",
}));

import { generateText } from "ai";
import {
  formatEditorBrief,
  generateDraft,
  reviseDraft,
  runPipeline,
  runQualityPipeline,
} from "../lib/pipeline/run-pipeline";
import type { EvalResult } from "../lib/ai/schema";
import { evalResultSchema } from "../lib/ai/schema";

const generateTextMock = vi.mocked(generateText);

const evalPayload: EvalResult = evalResultSchema.parse({
  scores: {
    point_of_view: 4,
    structure: 5,
    tone: 4,
    technical_precision: 5,
    geo_readability: 4,
  },
  critique: {
    point_of_view: "Hedges too often.",
    structure: "Okay order.",
    tone: "Generic cadence.",
    technical_precision: "Some vagueness.",
    geo_readability: "Claims blur together.",
  },
  top_fixes: ["Remove hedges.", "Name one concrete claim.", "Break long paragraphs."],
  strengths: ["Clear topic sentence.", "Useful framing for engineers."],
  weaknesses: ["Hedges in the second paragraph.", "Vague claims."],
  prioritized_improvements: [
    "Remove hedges.",
    "Name one concrete claim.",
    "Break long paragraphs.",
  ],
  do_not_change: ["Opening stance.", "Audience framing."],
  confidence: "Medium",
});

function evalAt(overallLike: number): EvalResult {
  return evalResultSchema.parse({
    ...evalPayload,
    scores: {
      point_of_view: overallLike,
      structure: overallLike,
      tone: overallLike,
      technical_precision: overallLike,
      geo_readability: overallLike,
    },
  });
}

const brief = {
  topic: "Eval loops",
  audience: "Engineers",
  pov: "Rubrics win",
  voice: "Direct",
};

describe("pipeline", () => {
  beforeEach(() => {
    generateTextMock.mockReset();
  });

  it("generateDraft returns model text", async () => {
    generateTextMock.mockResolvedValueOnce({ text: "# Draft\n\nHello." } as never);
    await expect(generateDraft(brief)).resolves.toBe("# Draft\n\nHello.");
  });

  it("reviseDraft feeds structured critic fields to the editor", async () => {
    generateTextMock.mockResolvedValueOnce({ text: "Revised copy." } as never);
    const revised = await reviseDraft("Original.", evalPayload);
    expect(revised).toBe("Revised copy.");
    const call = generateTextMock.mock.calls[0]?.[0] as { prompt: string };
    expect(call.prompt).toContain("Original.");
    expect(call.prompt).toContain("Strengths");
    expect(call.prompt).toContain("Clear topic sentence.");
    expect(call.prompt).toContain("Do not change");
    expect(call.prompt).toContain("Opening stance.");
    expect(call.prompt).toContain("Remove hedges.");
    expect(call.prompt).toContain("Confidence: Medium");
  });

  it("formatEditorBrief includes overall score and metric scores", () => {
    const briefText = formatEditorBrief(evalPayload);
    expect(briefText).toContain("Overall score:");
    expect(briefText).toContain("point_of_view:");
    expect(briefText).toContain("Weaknesses");
  });

  it("runPipeline without revise returns draft + eval only", async () => {
    generateTextMock
      .mockResolvedValueOnce({ text: "First draft body." } as never)
      .mockResolvedValueOnce({ text: JSON.stringify(evalPayload) } as never);

    const result = await runPipeline(brief);
    expect(result.draft).toBe("First draft body.");
    expect(result.draftEval.scores.point_of_view).toBe(4);
    expect(result.draftEval.strengths.length).toBeGreaterThan(0);
    expect(result.revisedDraft).toBeUndefined();
    expect(result.revisedEval).toBeUndefined();
    expect(generateTextMock).toHaveBeenCalledTimes(2);
  });

  it("runPipeline with revise returns both versions and evals", async () => {
    const revisedEval = evalAt(7);

    generateTextMock
      .mockResolvedValueOnce({ text: "Draft A" } as never)
      .mockResolvedValueOnce({ text: JSON.stringify(evalPayload) } as never)
      .mockResolvedValueOnce({ text: "Draft B" } as never)
      .mockResolvedValueOnce({ text: JSON.stringify(revisedEval) } as never);

    const result = await runPipeline(brief, { revise: true });
    expect(result.draft).toBe("Draft A");
    expect(result.revisedDraft).toBe("Draft B");
    expect(result.revisedEval?.scores.point_of_view).toBe(7);
    expect(generateTextMock).toHaveBeenCalledTimes(4);
  });

  it("runQualityPipeline stops with threshold_reached on strong initial draft", async () => {
    generateTextMock
      .mockResolvedValueOnce({ text: "Strong draft" } as never)
      .mockResolvedValueOnce({ text: JSON.stringify(evalAt(8)) } as never);

    const result = await runQualityPipeline(brief, {
      threshold: 7,
      maxIterations: 3,
    });

    expect(result.stopReason).toBe("threshold_reached");
    expect(result.iterations).toHaveLength(1);
    expect(result.revisionHistory).toEqual(result.iterations);
    expect(result.iterations[0]?.iteration).toBe(1);
    expect(result.iterations[0]?.accepted).toBe(true);
    expect(result.finalDraft).toBe("Strong draft");
    expect(generateTextMock).toHaveBeenCalledTimes(2);
  });

  it("runQualityPipeline accepts improving revision then hits threshold", async () => {
    generateTextMock
      .mockResolvedValueOnce({ text: "Weak draft" } as never)
      .mockResolvedValueOnce({ text: JSON.stringify(evalAt(4)) } as never)
      .mockResolvedValueOnce({ text: "Better draft" } as never)
      .mockResolvedValueOnce({ text: JSON.stringify(evalAt(8)) } as never);

    const result = await runQualityPipeline(brief, {
      threshold: 7,
      maxIterations: 3,
    });

    expect(result.stopReason).toBe("threshold_reached");
    expect(result.iterations).toHaveLength(2);
    expect(result.iterations[0]?.iteration).toBe(1);
    expect(result.iterations[1]?.iteration).toBe(2);
    expect(result.iterations[1]?.accepted).toBe(true);
    expect(result.finalDraft).toBe("Better draft");
    expect(result.finalOverallScore).toBe(8);
  });

  it("runQualityPipeline rejects non-improving revision with no_improvement", async () => {
    generateTextMock
      .mockResolvedValueOnce({ text: "Weak draft" } as never)
      .mockResolvedValueOnce({ text: JSON.stringify(evalAt(5)) } as never)
      .mockResolvedValueOnce({ text: "Worse draft" } as never)
      .mockResolvedValueOnce({ text: JSON.stringify(evalAt(4)) } as never);

    const result = await runQualityPipeline(brief, {
      threshold: 7,
      maxIterations: 3,
    });

    expect(result.stopReason).toBe("no_improvement");
    expect(result.iterations).toHaveLength(2);
    expect(result.iterations[1]?.accepted).toBe(false);
    expect(result.finalDraft).toBe("Weak draft");
    expect(result.finalOverallScore).toBe(5);
  });

  it("runQualityPipeline stops with max_iterations when still below threshold", async () => {
    generateTextMock
      .mockResolvedValueOnce({ text: "D0" } as never)
      .mockResolvedValueOnce({ text: JSON.stringify(evalAt(3)) } as never)
      .mockResolvedValueOnce({ text: "D1" } as never)
      .mockResolvedValueOnce({ text: JSON.stringify(evalAt(4)) } as never)
      .mockResolvedValueOnce({ text: "D2" } as never)
      .mockResolvedValueOnce({ text: JSON.stringify(evalAt(5)) } as never);

    const result = await runQualityPipeline(brief, {
      threshold: 9,
      maxIterations: 2,
    });

    expect(result.stopReason).toBe("max_iterations");
    expect(result.iterations).toHaveLength(3);
    expect(result.iterations.map((i) => i.iteration)).toEqual([1, 2, 3]);
    expect(result.iterations.every((i) => i.accepted)).toBe(true);
    expect(result.finalDraft).toBe("D2");
    expect(result.finalOverallScore).toBe(5);
  });
});
