"use client";

import {
  RUBRIC_DIMENSIONS,
  type RubricKey,
} from "@/lib/harness/rubric";
import type { EvalResult } from "@/lib/ai/schema";

type ScorecardProps = {
  evaluation: EvalResult | null;
  previous?: EvalResult | null;
  emptyLabel?: string;
};

function delta(current: number, prev?: number): string | null {
  if (prev === undefined) return null;
  const d = current - prev;
  if (d === 0) return "±0";
  return d > 0 ? `+${d}` : `${d}`;
}

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
          const d = delta(score, prevScore);
          const pct = `${Math.max(0, Math.min(100, score * 10))}%`;
          return (
            <div key={dim.key} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    {dim.label}
                  </p>
                  <p className="text-xs text-[var(--muted)]">{dim.description}</p>
                </div>
                <div className="flex items-baseline gap-2 font-[family-name:var(--font-mono)] text-sm">
                  <span className="font-medium tabular-nums">{score}</span>
                  {d && (
                    <span
                      className={
                        d.startsWith("+")
                          ? "text-[var(--ok)]"
                          : d.startsWith("-")
                            ? "text-[var(--warn)]"
                            : "text-[var(--muted)]"
                      }
                    >
                      {d}
                    </span>
                  )}
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                  style={{ width: pct }}
                />
              </div>
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
