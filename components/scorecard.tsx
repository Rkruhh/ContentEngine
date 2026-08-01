"use client";

import {
  RUBRIC_DIMENSIONS,
  type RubricKey,
} from "@/lib/harness/rubric";
import type { EvalResult } from "@/lib/ai/schema";
import { MetricBar } from "@/components/ui/metric-bar";

type ScorecardProps = {
  evaluation: EvalResult | null;
  previous?: EvalResult | null;
  emptyLabel?: string;
};

export function Scorecard({
  evaluation,
  previous,
  emptyLabel,
}: ScorecardProps) {
  if (!evaluation) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-sm border border-dashed border-[var(--line)] bg-[var(--bg-elevated)]/60 px-4 text-sm text-[var(--muted)]">
        {emptyLabel ?? "Scores appear after evaluation"}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)] p-5">
      <div className="flex flex-col gap-4">
        {RUBRIC_DIMENSIONS.map((dim) => {
          const score = evaluation.scores[dim.key as RubricKey];
          const prevScore = previous?.scores[dim.key as RubricKey];
          const delta =
            prevScore === undefined ? null : score - prevScore;
          return (
            <div key={dim.key} className="flex flex-col gap-1.5">
              <MetricBar
                label={dim.label}
                value={score}
                hint={dim.description}
                delta={delta}
              />
              <p className="text-sm text-[var(--muted)]">
                {evaluation.critique[dim.key as RubricKey]}
              </p>
            </div>
          );
        })}
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
          Top fixes
        </h3>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-[var(--ink)]">
          {evaluation.top_fixes.map((fix) => (
            <li key={fix}>{fix}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
