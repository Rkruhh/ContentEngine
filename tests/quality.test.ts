import { describe, expect, it } from "vitest";
import { evalResultSchema, type EvalResult } from "../lib/ai/schema";
import { meetsThreshold, overallScore } from "../lib/pipeline/quality";

function evalWithScores(partial: Partial<EvalResult["scores"]>): EvalResult {
  return evalResultSchema.parse({
    scores: {
      point_of_view: 5,
      structure: 5,
      tone: 5,
      technical_precision: 5,
      geo_readability: 5,
      ...partial,
    },
    critique: {
      point_of_view: "c",
      structure: "c",
      tone: "c",
      technical_precision: "c",
      geo_readability: "c",
    },
    top_fixes: ["a", "b", "c"],
  });
}

describe("overallScore", () => {
  it("averages all five rubric dimensions", () => {
    const evaluation = evalWithScores({
      point_of_view: 10,
      structure: 8,
      tone: 6,
      technical_precision: 4,
      geo_readability: 2,
    });
    expect(overallScore(evaluation)).toBe(6);
  });
});

describe("meetsThreshold", () => {
  it("returns true when overall is at or above threshold", () => {
    expect(meetsThreshold(evalWithScores({}), 5)).toBe(true);
    expect(meetsThreshold(evalWithScores({}), 5.1)).toBe(false);
  });
});
