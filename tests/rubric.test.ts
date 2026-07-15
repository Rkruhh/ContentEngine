import { describe, expect, it } from "vitest";
import { parseEvalJson } from "../lib/harness/run-eval";
import { evalResultSchema } from "../lib/ai/schema";
import { RUBRIC_DIMENSIONS, RUBRIC_KEYS } from "../lib/harness/rubric";

const validPayload = {
  scores: {
    point_of_view: 7,
    structure: 6,
    tone: 5,
    technical_precision: 8,
    geo_readability: 6,
  },
  critique: {
    point_of_view: "Clear stance.",
    structure: "Sections progress well.",
    tone: "Slightly flat mid-piece.",
    technical_precision: "Specific and accurate.",
    geo_readability: "Claims are extractable.",
  },
  top_fixes: ["Sharpen the mid-tone.", "Add one concrete example.", "Tighten the close."],
};

describe("rubric", () => {
  it("defines exactly five dimensions with stable keys", () => {
    expect(RUBRIC_DIMENSIONS).toHaveLength(5);
    expect(RUBRIC_KEYS).toEqual([
      "point_of_view",
      "structure",
      "tone",
      "technical_precision",
      "geo_readability",
    ]);
  });
});

describe("parseEvalJson", () => {
  it("parses raw JSON", () => {
    const parsed = parseEvalJson(JSON.stringify(validPayload));
    expect(evalResultSchema.parse(parsed)).toMatchObject(validPayload);
  });

  it("strips markdown fences", () => {
    const fenced = `Here you go:\n\`\`\`json\n${JSON.stringify(validPayload)}\n\`\`\`\n`;
    const parsed = parseEvalJson(fenced);
    expect(evalResultSchema.parse(parsed).scores.point_of_view).toBe(7);
  });

  it("rejects missing JSON object", () => {
    expect(() => parseEvalJson("no json here")).toThrow(/JSON object/);
  });

  it("rejects schema-invalid scores via zod", () => {
    const bad = {
      ...validPayload,
      scores: { ...validPayload.scores, tone: 12 },
    };
    expect(() => evalResultSchema.parse(bad)).toThrow();
  });
});
