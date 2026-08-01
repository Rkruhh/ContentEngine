"use client";

import { SectionCard } from "@/components/ui/section-card";

type ReasoningSummaryProps = {
  summary: string;
};

export function ReasoningSummary({ summary }: ReasoningSummaryProps) {
  return (
    <SectionCard title="AI reasoning summary">
      <p className="text-base leading-relaxed text-[var(--ink)]">{summary}</p>
    </SectionCard>
  );
}
