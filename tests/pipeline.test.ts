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
  generateDraft,
  reviseDraft,
  runPipeline,
} from "../lib/pipeline/run-pipeline";
import type { EvalResult } from "../lib/ai/schema";

const generateTextMock = vi.mocked(generateText);

const evalPayload: EvalResult = {
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
};

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

  it("reviseDraft incorporates top fixes into the prompt", async () => {
    generateTextMock.mockResolvedValueOnce({ text: "Revised copy." } as never);
    const revised = await reviseDraft("Original.", evalPayload);
    expect(revised).toBe("Revised copy.");
    const call = generateTextMock.mock.calls[0]?.[0] as { prompt: string };
    expect(call.prompt).toContain("Remove hedges.");
    expect(call.prompt).toContain("Original.");
  });

  it("runPipeline without revise returns draft + eval only", async () => {
    generateTextMock
      .mockResolvedValueOnce({ text: "First draft body." } as never)
      .mockResolvedValueOnce({ text: JSON.stringify(evalPayload) } as never);

    const result = await runPipeline(brief);
    expect(result.draft).toBe("First draft body.");
    expect(result.draftEval.scores.point_of_view).toBe(4);
    expect(result.revisedDraft).toBeUndefined();
    expect(result.revisedEval).toBeUndefined();
    expect(generateTextMock).toHaveBeenCalledTimes(2);
  });

  it("runPipeline with revise returns both versions and evals", async () => {
    const revisedEval: EvalResult = {
      ...evalPayload,
      scores: { ...evalPayload.scores, point_of_view: 7, tone: 7 },
    };

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
});
