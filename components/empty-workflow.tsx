"use client";

import { SectionCard } from "@/components/ui/section-card";

const STEPS = [
  "Describe your content.",
  "AI creates a draft.",
  "AI critiques its own writing.",
  "AI improves the content.",
  "Best version is returned.",
];

export function EmptyWorkflow() {
  return (
    <SectionCard
      title="How Content Engine works"
      description="A closed loop: draft, critique, revise, and keep only improvements."
    >
      <ol className="flex flex-col gap-0">
        {STEPS.map((step, index) => (
          <li key={step} className="flex flex-col">
            {index > 0 && (
              <div className="ml-4 h-5 w-px bg-[var(--line)]" aria-hidden />
            )}
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-[var(--ink)] font-[family-name:var(--font-mono)] text-xs font-medium text-[var(--bg-elevated)]">
                {index + 1}
              </span>
              <p className="pt-1.5 text-sm font-medium text-[var(--ink)]">
                {step}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}
