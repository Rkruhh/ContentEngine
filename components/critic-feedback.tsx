"use client";

import type { EvalResult } from "@/lib/ai/schema";
import { DASHBOARD_METRICS, formatScore } from "@/lib/ui/metrics";
import { BadgeList } from "@/components/ui/badge-list";
import { MetricBar } from "@/components/ui/metric-bar";
import { SectionCard } from "@/components/ui/section-card";

type CriticFeedbackProps = {
  evaluation: EvalResult;
  title?: string;
};

export function CriticFeedback({
  evaluation,
  title = "Critic feedback",
}: CriticFeedbackProps) {
  const improvements =
    evaluation.prioritized_improvements.length > 0
      ? evaluation.prioritized_improvements
      : evaluation.top_fixes;

  const confidenceTone =
    evaluation.confidence === "High"
      ? "ok"
      : evaluation.confidence === "Low"
        ? "warn"
        : "accent";

  return (
    <SectionCard title={title}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-wide text-[var(--muted)] uppercase">
            Overall score
          </p>
          <p className="font-[family-name:var(--font-mono)] text-3xl font-semibold tabular-nums text-[var(--ink)]">
            {formatScore(evaluation.overall_score)}
          </p>
        </div>
        <div className="text-right">
          <p className="mb-1 text-xs tracking-wide text-[var(--muted)] uppercase">
            Confidence
          </p>
          <BadgeList items={[evaluation.confidence]} tone={confidenceTone} />
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3">
        <h3 className="text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
          Metric breakdown
        </h3>
        {DASHBOARD_METRICS.map((metric) => (
          <MetricBar
            key={metric.key}
            label={metric.label}
            value={evaluation.scores[metric.key]}
          />
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
            Strengths
          </h3>
          <BadgeList items={evaluation.strengths} tone="ok" />
        </div>
        <div>
          <h3 className="mb-2 text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
            Weaknesses
          </h3>
          <BadgeList items={evaluation.weaknesses} tone="warn" />
        </div>
        <div>
          <h3 className="mb-2 text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
            Priority improvements
          </h3>
          <BadgeList items={improvements} tone="accent" />
        </div>
        <div>
          <h3 className="mb-2 text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
            Preserve
          </h3>
          <BadgeList
            items={evaluation.do_not_change}
            tone="neutral"
            emptyLabel="Nothing locked"
          />
        </div>
      </div>
    </SectionCard>
  );
}
