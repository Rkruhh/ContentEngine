import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { RUBRIC_KEYS, type RubricKey } from "../lib/harness/rubric";
import { runPipeline } from "../lib/pipeline/run-pipeline";
import { EVAL_CASES } from "./cases";

type CaseResult = {
  id: string;
  pass: boolean;
  scores: Record<RubricKey, number>;
  minScores: Record<RubricKey, number>;
  failures: string[];
  draftPreview: string;
};

async function main() {
  if (!process.env.GROQ_API_KEY) {
    console.error("Missing GROQ_API_KEY. Copy .env.example to .env.local and set your key.");
    process.exit(1);
  }

  const results: CaseResult[] = [];

  for (const testCase of EVAL_CASES) {
    process.stdout.write(`Running ${testCase.id}… `);
    try {
      const pipeline = await runPipeline(testCase.brief, { revise: false });
      const failures: string[] = [];
      for (const key of RUBRIC_KEYS) {
        const actual = pipeline.draftEval.scores[key];
        const min = testCase.minScores[key];
        if (actual < min) {
          failures.push(`${key}: ${actual} < min ${min}`);
        }
      }
      const pass = failures.length === 0;
      console.log(pass ? "PASS" : "FAIL");
      results.push({
        id: testCase.id,
        pass,
        scores: pipeline.draftEval.scores,
        minScores: testCase.minScores,
        failures,
        draftPreview: pipeline.draft.slice(0, 240),
      });
    } catch (err) {
      console.log("ERROR");
      results.push({
        id: testCase.id,
        pass: false,
        scores: {
          point_of_view: 0,
          structure: 0,
          tone: 0,
          technical_precision: 0,
          geo_readability: 0,
        },
        minScores: testCase.minScores,
        failures: [err instanceof Error ? err.message : String(err)],
        draftPreview: "",
      });
    }
  }

  console.log("\n┌────────────────────────────────┬────────┐");
  console.log("│ Case                           │ Result │");
  console.log("├────────────────────────────────┼────────┤");
  for (const r of results) {
    const name = r.id.padEnd(30).slice(0, 30);
    const mark = r.pass ? " PASS " : " FAIL ";
    console.log(`│ ${name} │${mark} │`);
  }
  console.log("└────────────────────────────────┴────────┘");

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n${passed}/${results.length} passed`);

  const outDir = path.join(process.cwd(), "evals", "results");
  await mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = path.join(outDir, `${stamp}.json`);
  await writeFile(outPath, JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
  console.log(`Wrote ${outPath}`);

  process.exit(passed === results.length ? 0 : 1);
}

main();
