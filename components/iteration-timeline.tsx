"use client";

import type { PipelineIteration } from "@/lib/pipeline/run-pipeline";
import { formatScore } from "@/lib/ui/metrics";
import { renderMarkdown } from "@/lib/markdown";
import { SectionCard } from "@/components/ui/section-card";

type IterationTimelineProps = {
  iterations: PipelineIteration[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

function eventLabel(item: PipelineIteration, index: number): string {
  if (index === 0) return "Draft generated + evaluated";
  return item.accepted
    ? "Revision accepted after re-evaluation"
    : "Revision rejected after re-evaluation";
}

export function IterationTimeline({
  iterations,
  selectedIndex,
  onSelect,
}: IterationTimelineProps) {
  const selected = iterations[selectedIndex];

  return (
    <SectionCard
      title="Iteration timeline"
      description="Click an iteration to inspect its draft and evaluation"
    >
      <ol className="mb-5 flex flex-col gap-0">
        {iterations.map((item, index) => {
          const active = index === selectedIndex;
          return (
            <li key={`${item.iteration}-${item.accepted}`} className="flex flex-col">
              {index > 0 && (
                <div className="ml-4 h-4 w-px bg-[var(--line)]" aria-hidden />
              )}
              <button
                type="button"
                onClick={() => onSelect(index)}
                className={[
                  "flex w-full items-start gap-3 rounded-md border px-3 py-3 text-left transition",
                  active
                    ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg-elevated)]"
                    : "border-[var(--line)] bg-[var(--bg)] hover:border-[var(--accent)]",
                ].join(" ")}
              >
                <span
                  className={`mt-0.5 font-[family-name:var(--font-mono)] text-xs ${active ? "opacity-70" : "text-[var(--muted)]"}`}
                >
                  {String(item.iteration).padStart(2, "0")}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">
                    Iteration {item.iteration}
                  </span>
                  <span
                    className={`mt-0.5 block text-xs ${active ? "opacity-80" : "text-[var(--muted)]"}`}
                  >
                    {eventLabel(item, index)} · overall{" "}
                    {formatScore(item.overallScore)} ·{" "}
                    {item.accepted ? "Accepted" : "Rejected"}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        <li className="flex flex-col">
          <div className="ml-4 h-4 w-px bg-[var(--line)]" aria-hidden />
          <div className="rounded-md border border-[var(--accent)]/35 bg-[var(--accent-soft)] px-3 py-3">
            <p className="text-sm font-semibold text-[var(--ink)]">
              Final version
            </p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Best accepted draft returned by the pipeline
            </p>
          </div>
        </li>
      </ol>

      {selected && (
        <div className="grid gap-4 border-t border-[var(--line)] pt-5 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
              Draft
            </h3>
            <div
              className="prose-draft max-h-64 overflow-y-auto rounded-sm border border-[var(--line)] bg-[var(--bg)] p-4"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: controlled markdown renderer
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(selected.draft),
              }}
            />
          </div>
          <div>
            <h3 className="mb-2 text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
              Evaluation · {formatScore(selected.overallScore)}
            </h3>
            <div className="max-h-64 space-y-3 overflow-y-auto rounded-sm border border-[var(--line)] bg-[var(--bg)] p-4 text-sm">
              <p>
                <span className="text-[var(--muted)]">Status:</span>{" "}
                {selected.accepted ? "Accepted" : "Rejected"}
              </p>
              <p>
                <span className="text-[var(--muted)]">Confidence:</span>{" "}
                {selected.evaluation.confidence}
              </p>
              <div>
                <p className="mb-1 text-[var(--muted)]">Priority improvements</p>
                <ul className="list-disc space-y-1 pl-5">
                  {(selected.evaluation.prioritized_improvements.length > 0
                    ? selected.evaluation.prioritized_improvements
                    : selected.evaluation.top_fixes
                  ).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
