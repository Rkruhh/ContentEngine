"use client";

import type { EvalResult } from "@/lib/ai/schema";
import { DASHBOARD_METRICS, formatScore } from "@/lib/ui/metrics";
import { MetricBar } from "@/components/ui/metric-bar";
import { SectionCard } from "@/components/ui/section-card";

type QualityDashboardProps = {
  original: EvalResult;
  final: EvalResult;
  originalOverall: number;
  finalOverall: number;
};

export function QualityDashboard({
  original,
  final,
  originalOverall,
  finalOverall,
}: QualityDashboardProps) {
  const delta = finalOverall - originalOverall;

  return (
    <SectionCard title="Quality dashboard">
      <div className="mb-6 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="rounded-md border border-[var(--line)] bg-[var(--bg)] px-4 py-3">
          <p className="text-xs tracking-wide text-[var(--muted)] uppercase">
            Original overall
          </p>
          <p className="font-[family-name:var(--font-mono)] text-3xl font-semibold tabular-nums">
            {formatScore(originalOverall)}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center text-center">
          <span className="text-[var(--muted)]">↓</span>
          <span
            className={`font-[family-name:var(--font-mono)] text-sm font-semibold ${
              delta > 0
                ? "text-[var(--ok)]"
                : delta < 0
                  ? "text-[var(--warn)]"
                  : "text-[var(--muted)]"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)}
          </span>
          <span className="text-xs text-[var(--muted)]">Score improvement</span>
        </div>
        <div className="rounded-md border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-3">
          <p className="text-xs tracking-wide text-[var(--accent)] uppercase">
            Final overall
          </p>
          <p className="font-[family-name:var(--font-mono)] text-3xl font-semibold tabular-nums text-[var(--ink)]">
            {formatScore(finalOverall)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {DASHBOARD_METRICS.map((metric) => (
          <MetricBar
            key={metric.key}
            label={metric.label}
            value={final.scores[metric.key]}
            delta={final.scores[metric.key] - original.scores[metric.key]}
          />
        ))}
      </div>
    </SectionCard>
  );
}
