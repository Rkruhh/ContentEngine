"use client";

import type { StopReason } from "@/lib/pipeline/quality";
import { SectionCard } from "@/components/ui/section-card";

const COPY: Record<
  StopReason,
  { title: string; detail: string }
> = {
  threshold_reached: {
    title: "Quality Threshold Reached",
    detail: "Overall score met or exceeded the configured quality bar.",
  },
  max_iterations: {
    title: "Maximum Iterations Reached",
    detail: "The pipeline used every allowed revision attempt.",
  },
  no_improvement: {
    title: "No Further Improvement",
    detail: "The latest revision did not beat the previous overall score.",
  },
};

type StopReasonBannerProps = {
  reason: StopReason;
  threshold: number;
  maxIterations: number;
};

export function StopReasonBanner({
  reason,
  threshold,
  maxIterations,
}: StopReasonBannerProps) {
  const copy = COPY[reason];
  return (
    <SectionCard>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">
            ✓ {copy.title}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">{copy.detail}</p>
        </div>
        <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--muted)]">
          threshold {threshold} · max {maxIterations}
        </p>
      </div>
    </SectionCard>
  );
}
